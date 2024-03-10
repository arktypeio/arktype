import { Scope, type rootResolutions } from "../scope.js"

export namespace JsObjects {
	export interface exports {
		Array: Array<unknown>
		Function: Function
		Date: Date
		Error: Error
		Map: Map<unknown, unknown>
		RegExp: RegExp
		Set: Set<unknown>
		WeakMap: WeakMap<object, unknown>
		WeakSet: WeakSet<object>
		Promise: Promise<unknown>
	}

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof JsObjects)["infer"]
}

export const JsObjects: Scope<{
	exports: JsObjects.resolutions
	locals: {}
	ambient: {}
}> = Scope.root.scope(
	{
		Array,
		Function,
		Date,
		Error,
		Map,
		RegExp,
		Set,
		WeakMap,
		WeakSet,
		Promise
	},
	{ prereducedAliases: true }
)
