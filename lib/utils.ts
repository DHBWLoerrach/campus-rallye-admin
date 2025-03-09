import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SupportedStorage } from "@supabase/supabase-js"

function supportsLocalStorage() {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    return true;
  } catch (e) {
    return false;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const customStorageAdapter: SupportedStorage = {
    getItem: (key) => {
    if (!supportsLocalStorage()) {
        // Configure alternate storage
        return null
    }
    return globalThis.localStorage.getItem(key)
    },
    setItem: (key, value) => {
    if (!supportsLocalStorage()) {
        // Configure alternate storage here
        return
    }
    globalThis.localStorage.setItem(key, value)
    },
    removeItem: (key) => {
    if (!supportsLocalStorage()) {
        // Configure alternate storage here
        return
    }
    globalThis.localStorage.removeItem(key)
    },
}
