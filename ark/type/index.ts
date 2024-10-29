export {
	ArkError,
	ArkErrors,
	type ArkConfig,
	type ArkScopeConfig,
	type JsonSchema
} from "@ark/schema"
export { Hkt, inferred } from "@ark/util"
export type { Out, number, string } from "./attributes.ts"
export { Generic } from "./generic.ts"
export {
	ark,
	declare,
	define,
	generic,
	keywords,
	type,
	type Ark
} from "./keywords/keywords.ts"
export { Module, type BoundModule, type Submodule } from "./module.ts"
export { module, scope, type Scope } from "./scope.ts"
export { Type } from "./type.ts"
