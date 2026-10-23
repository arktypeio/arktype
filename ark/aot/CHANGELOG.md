# @ark/aot

## 0.0.1

Initial release: constructs arktype definitions at build time, so arktype's parser never ships (#810). It runs as a bundler plugin, as Node, Bun and Turbopack drivers, as `arktype-precompile --check`, as `arktype-precompile --emit` over what `tsc` emits and as an ESLint rule, and `arktype-precompile --declare` emits declarations sharing one file of shapes. See the [README](./README.md).

With `optimize: "size"`, as the `"smallest"` preset sets, and detailed errors, a build writes each node as a call to a small runtime checker that describes what it checks from its rule, and each site creates its validator in place. A module whose Types are too few to pay for the checkers' runtime is compiled instead.
