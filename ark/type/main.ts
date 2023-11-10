export { Problem, Problems } from "@arktype/schema"
export type { Out } from "@arktype/schema"
export type { Module, Scope } from "./scope.ts"
export {
	ark,
	arktypes,
	declare,
	define,
	scope,
	type,
	match,
	type Ark
} from "./scopes/ark.ts"
export { jsObjects } from "./scopes/jsObjects.ts"
export { tsGenerics } from "./scopes/tsGenerics.ts"
export { tsKeywords } from "./scopes/tsKeywords.ts"
export { validation } from "./scopes/validation.ts"
export { Type } from "./type.ts"
export type { inferTypeRoot, validateTypeRoot } from "./type.ts"
