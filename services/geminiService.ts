
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found via process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export interface MarketDataResult {
  price: number;
  currency: string;
  sources: { title: string; uri: string }[];
}

export const fetchMarketPrice = async (symbol: string, name: string): Promise<MarketDataResult | null> => {
  const ai = getClient();
  if (!ai) return null;

  try {
    const prompt = `Find the latest real-time market price for "${name}" (Symbol: ${symbol}). 
    If it is a Malaysian stock/fund, return price in MYR. If US, in USD.
    
    Return the output strictly in this format:
    Price: [numeric value]
    Currency: [currency code]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Extract sources
    const sources = groundingChunks
      .map((chunk) => {
        if (chunk.web) return { title: chunk.web.title || "Web Source", uri: chunk.web.uri || "#" };
        return null;
      })
      .filter((s): s is { title: string; uri: string } => s !== null);

    // Simple parsing logic
    const priceMatch = text.match(/Price:\s*([\d,.]+)/i);
    const currencyMatch = text.match(/Currency:\s*([A-Z]{3})/i);

    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      const currency = currencyMatch ? currencyMatch[1] : "MYR"; // Default to MYR if not found

      return {
        price,
        currency,
        sources,
      };
    }

    return null;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export interface FDPromotion {
    bank: string;
    rate: string;
    tenure: string;
    notes: string;
}

export const searchFDPromotions = async (): Promise<{ promotions: FDPromotion[], rawText: string } | null> => {
    const ai = getClient();
    if (!ai) return null;

    try {
        const today = new Date();
        const monthYear = today.toLocaleDateString('default', { month: 'long', year: 'numeric' });
        
        const prompt = `Find the latest Fixed Deposit (FD) promotions and interest rates in Malaysia for ${monthYear}. 
        Find the top 5 banks with the best rates for 3, 6, and 12 month tenures.
        
        Format the output clearly listing the Bank Name, Interest Rate, Tenure, and any short key condition (e.g. min deposit).
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.5,
            },
        });

        // We will just return the raw text for the UI to display comfortably, 
        // as structured parsing varies wildly with search results.
        return {
            promotions: [], 
            rawText: response.text || "No results found."
        };
    } catch (error) {
        console.error("Gemini FD Search Error", error);
        return null;
    }
}
