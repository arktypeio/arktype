export { Problem, Problems } from "@arktype/schema"
export type { Out } from "@arktype/schema"
export type { Module, Scope } from "./scope.js"
export {
	ark,
	arktypes,
	declare,
	define,
	scope,
	type,
	type Ark
} from "./scopes/ark.js"
export { jsObjects } from "./scopes/jsObjects.js"
export { tsGenerics } from "./scopes/tsGenerics.js"
export { tsKeywords } from "./scopes/tsKeywords.js"
export { validation } from "./scopes/validation.js"
export { Type } from "./type.js"
export type { inferTypeRoot, validateTypeRoot } from "./type.js"
