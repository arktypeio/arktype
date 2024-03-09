export { ArkError, ArkErrors, ArkTypeError } from "@arktype/schema"
export type { Out, of as of } from "@arktype/schema"
export {
	ark,
	arktypes,
	declare,
	define,
	match,
	scope,
	type,
	type Ark
} from "./ark.js"
export type { Module, Scope } from "./scope.js"
export { Type } from "./type.js"
export type { inferTypeRoot, validateTypeRoot } from "./type.js"
