export {
	ArkErrors as Problems,
	type ArkTypeError as Problem
} from "@arktype/schema"
export type { Out, is } from "@arktype/schema"
export {
	ark,
	arktypes,
	declare,
	define,
	match,
	scope,
	type,
	when,
	type Ark
} from "./ark.js"
export type { Module, Scope } from "./scope.js"
export { Type } from "./type.js"
export type { inferTypeRoot, validateTypeRoot } from "./type.js"
