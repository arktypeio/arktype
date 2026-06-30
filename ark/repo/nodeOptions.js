// @ts-check

// Every Node version we support (see `engines.node`) strips TypeScript types
// natively by default — no flag required. This repo also contains no syntax
// that needs type *transformation* (no runtime enums, parameter properties, or
// value-bearing namespaces — only erasable `declare`/type-level forms), so
// stripping alone is sufficient and we pass no TS-related flags. Notably this
// avoids `--experimental-transform-types`, which Node >= 26 rejects in
// NODE_OPTIONS.

export const nodeDevOptions =
	`${process.env.NODE_OPTIONS ?? ""} --conditions ark-ts`.trimEnd()

export const addNodeDevOptions = extraOpts =>
	(process.env.NODE_OPTIONS = `${nodeDevOptions} ${extraOpts ?? ""}`.trimEnd())
