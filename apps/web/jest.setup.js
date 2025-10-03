// CommonJS-compatible setup for Jest runtime
require('@testing-library/jest-dom');

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
