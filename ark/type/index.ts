export {
	ArkError,
	ArkErrors,
	type ArkConfig,
	type ArkScopeConfig,
	type JsonSchema
} from "@ark/schema"
export { Hkt } from "@ark/util"
export type { Generic } from "./generic.ts"
export {
	ambient,
	ark,
	declare,
	define,
	generic,
	type,
	type Ark
} from "./keywords/ark.ts"
export { Module, type BoundModule, type Submodule } from "./module.ts"
export {
	module,
	scope,
	type Scope,
	type inferScope,
	type validateScope
} from "./scope.ts"
export {
	Type,
	type inferAmbient,
	type inferTypeRoot,
	type validateAmbient,
	type validateTypeRoot
} from "./type.ts"
