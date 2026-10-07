# Attest

Attest is a testing library that makes your TypeScript types available at runtime, giving you access to precise type-level assertions and performance benchmarks.

Assertions are framework agnostic and can be seamlessly integrated with your existing Vitest, Jest, or Mocha tests.

Benchmarks can run from anywhere and will deterministically report the number of type instantiations contributed by the contents of the `bench` call.

If you've ever wondered how [ArkType](https://github.com/arktypeio/arktype) can guarantee identical behavior between its runtime and static parser implementations and highly optimized editor performance, Attest is your answer⚡

## Installation

```bash
npm install @ark/attest
```

_Note: This package is still in alpha! Your feedback will help us iterate toward a stable 1.0._

## Docs

See [arktype.io/docs/attest](https://arktype.io/docs/attest) for:

- [Setup](https://arktype.io/docs/attest) with Vitest, Mocha and other test runners
- [Assertions](https://arktype.io/docs/attest/assertions) for types, values, errors, completions and JSDoc
- [Benches](https://arktype.io/docs/attest/benches) measuring type instantiations and runtime
- [Options](https://arktype.io/docs/attest/options) like `skipTypes` and `tsVersions`
- The [CLI](https://arktype.io/docs/attest/cli) for type performance stats and traces
- [Integrating](https://arktype.io/docs/attest/integration) attest's type data into your own assertions

Please don't hesitate to open a GitHub [issue](https://github.com/arktypeio/arktype/issues/new/choose) or [discussion](https://github.com/arktypeio/arktype/discussions/new/choose) or reach out on [ArkType's Discord](https://arktype.io/discord) if you have any questions or feedback- we'd love to hear from you! ⛵
