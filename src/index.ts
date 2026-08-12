/**
 * Public library surface.
 *
 * Every module that ships is exported: an operation reachable from the CLI or MCP
 * but not from the library would be a capability that exists three ways and is
 * documented one way.
 */
export * from './core/index.js';
export * from './format/index.js';
export * from './ops/index.js';
export * from './policy/index.js';
export * from './substrate/index.js';
export * from './surface/index.js';
export * from './views/generate.js';
export * from './gate.js';
