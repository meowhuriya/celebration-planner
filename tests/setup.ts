import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock: Storage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });

  // Mock window.print
  Object.defineProperty(window, "print", { value: () => {} });

  // Mock matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock HTMLCanvasElement.prototype.getContext for jsdom
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      roundRect: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: (text: string) => ({ width: (text || "").length * 8 }),
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(100) }),
      putImageData: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    } as unknown as RenderingContext;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
