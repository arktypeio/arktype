import type { Schema } from "../schema.js"
import { SchemaScope } from "../scope.js"

export namespace JsObjects {
	export interface resolutions {
		Array: Schema<"proto", Array<unknown>>
		Function: Schema<"proto", Function>
		Date: Schema<"proto", Date>
		Error: Schema<"proto", Error>
		Map: Schema<"proto", Map<unknown, unknown>>
		RegExp: Schema<"proto", RegExp>
		Set: Schema<"proto", Set<unknown>>
		WeakMap: Schema<"proto", WeakMap<object, unknown>>
		WeakSet: Schema<"proto", WeakSet<object>>
		Promise: Schema<"proto", Promise<unknown>>
	}

	export type infer = (typeof JsObjects)["infer"]
}

export const JsObjects: SchemaScope<JsObjects.resolutions> = SchemaScope.from({
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
