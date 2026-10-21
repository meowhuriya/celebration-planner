import type { CustomDesignState } from "./types";

const DB_NAME = "CelebrateCustomDesignDB";
const STORE_NAME = "designs";
const DB_VERSION = 1;
const RECORD_KEY = "active_custom_design";

// In-memory fallback if IndexedDB is blocked or unavailable
let memoryFallbackDesign: CustomDesignState | null = null;

/**
 * Checks whether IndexedDB is available and functional in the current environment.
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.indexedDB !== "undefined" && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Opens or initializes the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to open IndexedDB"));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves the custom design to IndexedDB.
 * If IndexedDB fails or is disabled (e.g. strict private browsing),
 * gracefully falls back to memory storage.
 */
export async function saveCustomDesign(design: CustomDesignState): Promise<{
  success: boolean;
  storageType: "indexeddb" | "memory";
  warning?: string;
}> {
  // Always update memory backup
  memoryFallbackDesign = { ...design };

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(design, RECORD_KEY);

        req.onsuccess = () => {
          resolve({ success: true, storageType: "indexeddb" });
        };

        req.onerror = () => {
          resolve({
            success: true,
            storageType: "memory",
            warning:
              "IndexedDB storage was blocked. Your card is saved in temporary memory for this browser session.",
          });
        };

        tx.oncomplete = () => {
          db.close();
        };
      } catch {
        resolve({
          success: true,
          storageType: "memory",
          warning:
            "IndexedDB write failed. Your card is saved in temporary memory for this browser session.",
        });
      }
    });
  } catch {
    return {
      success: true,
      storageType: "memory",
      warning:
        "IndexedDB is unavailable. Your card is saved in temporary memory for this browser session.",
    };
  }
}

/**
 * Loads the saved custom design from IndexedDB (or in-memory fallback).
 */
export async function loadCustomDesign(): Promise<{
  design: CustomDesignState | null;
  storageType: "indexeddb" | "memory";
}> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RECORD_KEY);

        req.onsuccess = () => {
          const result = req.result as CustomDesignState | undefined;
          db.close();
          if (result && result.imageSrc) {
            memoryFallbackDesign = result;
            resolve({ design: result, storageType: "indexeddb" });
          } else {
            resolve({ design: memoryFallbackDesign, storageType: "memory" });
          }
        };

        req.onerror = () => {
          db.close();
          resolve({ design: memoryFallbackDesign, storageType: "memory" });
        };
      } catch {
        resolve({ design: memoryFallbackDesign, storageType: "memory" });
      }
    });
  } catch {
    return { design: memoryFallbackDesign, storageType: "memory" };
  }
}

/**
 * Clears the stored design from IndexedDB and in-memory fallback.
 */
export async function clearCustomDesign(): Promise<boolean> {
  memoryFallbackDesign = null;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(RECORD_KEY);

        req.onsuccess = () => {
          db.close();
          resolve(true);
        };

        req.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}
