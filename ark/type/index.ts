export {
	ArkError,
	ArkErrors,
	type ArkConfig,
	type ArkScopeConfig,
	type JsonSchema
} from "@ark/schema"
export { Hkt, inferred } from "@ark/util"
export { Generic } from "./generic.ts"
export {
	ark as ambient,
	keywords as ark,
	declare,
	define,
	generic,
	type,
	type Ark
} from "./keywords/keywords.ts"
export { Module, type BoundModule, type Submodule } from "./module.ts"
export { module, scope, type Scope } from "./scope.ts"
export { Type } from "./type.ts"
