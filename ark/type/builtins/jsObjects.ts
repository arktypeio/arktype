import { schema } from "../schema.js"
import { Scope, type rootResolutions } from "../scope.js"

export namespace JsObjects {
	export interface exports {
		Array: unknown[]
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

export const JsObjects: Scope<JsObjects.resolutions> = Scope.root.scope(
	{
		Array: schema(Array),
		Function: schema(Function),
		Date: schema(Date),
		Error: schema(Error),
		Map: schema(Map),
		RegExp: schema(RegExp),
		Set: schema(Set),
		WeakMap: schema(WeakMap),
		WeakSet: schema(WeakSet),
		Promise: schema(Promise)
	},
	{ prereducedAliases: true }
)
