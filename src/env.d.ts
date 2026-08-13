/// <reference types="vite/client" />

declare global {
  interface Window {
    pixelForge: import('./types/electron').PixelForgeApi
  }
}

export {}
