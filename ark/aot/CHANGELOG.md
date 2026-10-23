# @ark/aot

## 0.0.1

Initial release: constructs arktype definitions at build time, so arktype's parser never ships (#810). It runs as a bundler plugin, as Node, Bun and Turbopack drivers, as `arktype-precompile --check`, as `arktype-precompile --emit` over what `tsc` emits and as an ESLint rule, and `arktype-precompile --declare` emits declarations sharing one file of shapes. See the [README](./README.md).

With `optimize: "size"`, as the `"smallest"` preset sets, and detailed errors, a build writes each node as a call to a small runtime checker that describes what it checks from its rule, and each site creates its validator in place. A module whose Types are too few to pay for the checkers' runtime is compiled instead.

With `json: true`, a build trusts the objects it checks to be plain data, as `JSON.parse` returns, so a Type rejecting undeclared keys counts a plain object's keys rather than checking each. On moltar's benchmark, it takes 0.82x a default build's cycles on parseStrict and 0.71x on assertStrict, level with ata's ahead-of-time build on parseStrict and 0.88x its cycles on assertStrict. Data with a declared key held non-enumerable can then pass with an undeclared key, as the options page shows.
