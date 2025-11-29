// Setup localStorage before any other modules are imported
// This must run before MSW server is imported, as MSW needs localStorage at import time

const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

// Set up localStorage on global and window
const localStorageMock = createStorageMock();
(global as any).localStorage = localStorageMock;
if (typeof window !== 'undefined') {
  (window as any).localStorage = localStorageMock;
}

// Set up sessionStorage
const sessionStorageMock = createStorageMock();
(global as any).sessionStorage = sessionStorageMock;
if (typeof window !== 'undefined') {
  (window as any).sessionStorage = sessionStorageMock;
}
