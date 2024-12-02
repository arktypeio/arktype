declare module "*.css" {}

declare module "*?raw" {
	const _: string
	export default _
}
