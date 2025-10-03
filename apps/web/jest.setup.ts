import '@testing-library/jest-dom';
// Silence next/navigation warnings in tests
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import '@testing-library/jest-dom';
