import '@testing-library/jest-dom';

// React 19 only flushes concurrent work inside act() when this flag is set.
// RTL sets it for its own renders; the R3F test renderer needs it globally.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
