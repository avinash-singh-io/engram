import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.gate1/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  /**
   * ARCHITECTURE RULE 1 (v2-overview §2, ADR-0024) — `core/` may import nothing
   * but `core/`.
   *
   * Tier 1 is invariant and I/O-free. Node builtins are forbidden too: a core
   * that can read a file is a core that will, and the ports in `core/ports.ts`
   * exist precisely so it does not have to.
   */
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/format/*', '**/ops/*', '**/substrate/*', '**/gate', '**/gate.js'],
              message:
                'core/ may import only core/ (v2-overview §2). Every dependency points inward — depend on core/ports.ts instead.',
            },
            {
              group: ['node:*', 'fs', 'path', 'os', 'crypto', 'child_process'],
              message:
                'core/ is pure and I/O-free (ADR-0024). Use a port from core/ports.ts; substrate/ implements it.',
            },
          ],
        },
      ],
    },
  },

  /**
   * ARCHITECTURE RULE 2 (v2-overview §2, ADR-0032) — nothing above `format/`
   * may see format-shaped data.
   *
   * Enforced at its only observable seam: a versioned codec may be imported by
   * `format/` alone. Everything else goes through the registry, which normalises
   * into `core/model.ts` first. Reaching past it is how OKF's shape leaks upward
   * and the core starts depending on someone else's YAML schema.
   */
  {
    // `src/core/**` is excluded because flat config is last-wins *per rule*:
    // without this, the block below would silently replace Rule 1's patterns
    // and core/ would be unguarded. Caught by deliberately violating both.
    files: ['src/**/*.ts'],
    ignores: ['src/format/**/*.ts', 'src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/format/okf-*'],
              message:
                'A versioned codec is importable only from format/ (v2-overview §2). Use format/registry.ts — it normalises into the internal model.',
            },
          ],
        },
      ],
    },
  },

  /** Test files may reach into any module under test. */
  {
    files: ['tests/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
