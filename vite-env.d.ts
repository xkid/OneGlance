// Fixed "Cannot find type definition file for 'vite/client'" by removing the reference.
// Fixed "Cannot redeclare block-scoped variable 'process'" by using interface augmentation.

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
      [key: string]: string | undefined;
    }
  }
}
