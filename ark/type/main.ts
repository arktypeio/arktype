export { ArkError, ArkErrors, ArkTypeError } from "@arktype/schema"
export type { Out } from "@arktype/schema"
export {
	ark,
	declare,
	define,
	keywords,
	match,
	schema,
	scope,
	type,
	type Ark
} from "./keywords/ark.js"
export type { Module, Scope } from "./scope.js"
export type { Type, inferTypeRoot, validateTypeRoot } from "./type.js"
