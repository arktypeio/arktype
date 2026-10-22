# @ark/aot

## 0.0.1

Initial release: constructs arktype definitions at build time, so arktype's parser never ships (#810). It runs as a bundler plugin, as Node, Bun and Turbopack drivers, as `arktype-precompile --check` and as an ESLint rule, and `arktype-precompile --declare` emits declarations sharing one file of shapes. See the [README](./README.md).
