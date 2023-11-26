import { NodeScope } from "../nodescope.js"
import type { Schema } from "../schema.js"

export namespace JsObjects {
	export interface resolutions {
		Array: Schema<Array<unknown>, "proto">
		Function: Schema<Function, "proto">
		Date: Schema<Date, "proto">
		Error: Schema<Error, "proto">
		Map: Schema<Map<unknown, unknown>, "proto">
		RegExp: Schema<RegExp, "proto">
		Set: Schema<Set<unknown>, "proto">
		WeakMap: Schema<WeakMap<object, unknown>, "proto">
		WeakSet: Schema<WeakSet<object>, "proto">
		Promise: Schema<Promise<unknown>, "proto">
	}

	export type infer = (typeof JsObjects)["infer"]
}

export const JsObjects: NodeScope<JsObjects.resolutions> = NodeScope.from({
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
})
