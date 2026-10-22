# Attest

Attest is a testing library that makes your TypeScript types available at runtime, so a test can assert on a value's type, the type errors and completions of an expression, and the type instantiations a block costs.

Assertions work from Vitest, Mocha, Jest or any runner with global setup and teardown hooks.

Benches run as plain scripts. They report how many type instantiations a block contributes, which is deterministic for a given TypeScript version, and how long a call takes.

If you've ever wondered how [ArkType](https://github.com/arktypeio/arktype) can guarantee identical behavior between its runtime and static parser implementations and highly optimized editor performance, Attest is your answer⚡

## Installation

```bash
npm install @ark/attest
```

_Note: This package is still in alpha! Your feedback will help us iterate toward a stable 1.0._

## Docs

See [arktype.io/docs/attest](https://arktype.io/docs/attest) for:

- [Getting started](https://arktype.io/docs/attest) with Vitest, Mocha, Jest and Bun
- [Assertions](https://arktype.io/docs/attest/assertions) for types, values, errors, completions and JSDoc
- [Benches](https://arktype.io/docs/attest/benches) measuring type instantiations and runtime
- [Options](https://arktype.io/docs/attest/options) like `skipTypes` and `typeToStringFormat`
- The [CLI](https://arktype.io/docs/attest/cli) for type performance stats and traces
- [Custom assertions](https://arktype.io/docs/attest/integration) built on the type data attest collects

Please don't hesitate to open a GitHub [issue](https://github.com/arktypeio/arktype/issues/new/choose) or [discussion](https://github.com/arktypeio/arktype/discussions/new/choose) or reach out on [ArkType's Discord](https://arktype.io/discord) if you have any questions or feedback- we'd love to hear from you! ⛵
