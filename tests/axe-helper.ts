// Re-export jest-axe with proper types for bundler module resolution
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jestAxe = require("jest-axe");

export const axe: (
  container: Element | Document
) => Promise<{ violations: unknown[] }> = jestAxe.axe;

export const toHaveNoViolations: {
  toHaveNoViolations(results: { violations: unknown[] }): {
    pass: boolean;
    message: () => string;
  };
} = jestAxe.toHaveNoViolations;
