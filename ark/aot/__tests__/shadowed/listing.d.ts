// a library the test writes to node_modules, which no driver precompiles
declare module "listing" {
	export const listOf: (t: unknown) => unknown
	export const jsonOf: (t: unknown) => unknown
	export const metaOf: (t: unknown) => unknown
	export const assertOf: (t: unknown, data: unknown) => unknown
	export const standardOf: (t: unknown, data: unknown) => unknown
}
