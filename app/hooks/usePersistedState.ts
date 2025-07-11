import { useState, useEffect, useCallback } from 'react';

// Simple encryption for localStorage (basic obfuscation)
const encode = (str: string): string => {
  return btoa(encodeURIComponent(str));
};

const decode = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
};

export function usePersistedState<T>(
  key: string, 
  defaultValue: T,
  encrypt: boolean = false
): [T, (value: T) => void, () => void] {
  const [state, setState] = useState<T>(defaultValue);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load from localStorage on mount and when key changes
  useEffect(() => {
    if (!isClient) return;
    
    try {
      const item = window.localStorage.getItem(key);
      if (item && item !== 'undefined' && item !== '') {
        const parsedValue = encrypt ? decode(item) : item;
        if (parsedValue && parsedValue !== 'undefined') {
          try {
            const value = JSON.parse(parsedValue);
            if (value !== null && value !== undefined) {
              setState(value);
              console.log(`✅ Loaded persisted value for ${key}:`, typeof value === 'string' ? `${value.substring(0, 10)}...` : value);
            }
          } catch (parseError) {
            // If JSON parsing fails, treat as string
            setState(parsedValue as T);
            console.log(`✅ Loaded persisted string for ${key}:`, typeof parsedValue === 'string' ? `${parsedValue.substring(0, 10)}...` : parsedValue);
          }
        }
      } else {
        console.log(`ℹ️ No persisted value found for ${key}, using default`);
      }
    } catch (error) {
      console.warn(`Error loading ${key} from localStorage:`, error);
    }
  }, [key, encrypt, isClient]);

  // Save to localStorage when state changes
  const setValue = useCallback((value: T) => {
    if (!isClient) {
      setState(value);
      return;
    }
    
    try {
      setState(value);
      if (value === null || value === undefined || value === '') {
        window.localStorage.removeItem(key);
        console.log(`🗑️ Removed empty value for ${key}`);
      } else {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        const storageValue = encrypt ? encode(stringValue) : stringValue;
        window.localStorage.setItem(key, storageValue);
        console.log(`💾 Saved value for ${key}:`, typeof value === 'string' ? `${value.substring(0, 10)}...` : value);
      }
    } catch (error) {
      console.warn(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, encrypt, isClient]);

  // Clear from localStorage
  const clearValue = useCallback(() => {
    if (!isClient) {
      setState(defaultValue);
      return;
    }
    
    try {
      window.localStorage.removeItem(key);
      setState(defaultValue);
      console.log(`🗑️ Cleared value for ${key}`);
    } catch (error) {
      console.warn(`Error clearing ${key} from localStorage:`, error);
    }
  }, [key, defaultValue, isClient]);

  return [state, setValue, clearValue];
} 