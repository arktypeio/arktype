// a library the test writes to node_modules, which no driver precompiles
declare module "listing" {
	export const listOf: (t: unknown) => unknown
	export const jsonOf: (t: unknown) => unknown
}
