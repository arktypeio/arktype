// the package is written to node_modules by the tests that read it
declare module "tagged" {
	export const Tagged: import("arktype").Type<{ tag: string }>
}
