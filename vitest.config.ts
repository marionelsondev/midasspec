import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Human output is asserted by substring; NO_COLOR keeps it free of ANSI
    // codes (picocolors honors it over FORCE_COLOR, which vitest sets).
    env: { NO_COLOR: '1' },
  },
});
