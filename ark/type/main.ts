export { ArkError, ArkErrors, ArkTypeError } from "@arktype/schema"
export type { Ark, ArkConfig, Out } from "@arktype/schema"
export {
	ambient,
	declare,
	define,
	ark,
	match,
	type
} from "./ark.js"
export { scope, type Module, type Scope } from "./scope.js"
export type { Type, inferTypeRoot, validateTypeRoot } from "./type.js"
