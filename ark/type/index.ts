export { ArkError, ArkErrors } from "@ark/schema"
export type { ArkConfig, ArkScopeConfig } from "@ark/schema"
export { Hkt } from "@ark/util"
export { ambient, ark, declare, define, generic, type } from "./ark.js"
export type { Generic } from "./generic.js"
export { Module, type Submodule } from "./module.js"
export {
	scope,
	type Scope,
	type inferScope,
	type validateScope
} from "./scope.js"
export {
	Type,
	type inferAmbient,
	type inferTypeRoot,
	type validateAmbient,
	type validateTypeRoot
} from "./type.js"
