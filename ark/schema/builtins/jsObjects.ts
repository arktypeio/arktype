import { ScopeNode } from "../scope.js"
import type { Schema } from "../type.js"

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

export const JsObjects: ScopeNode<JsObjects.resolutions> = ScopeNode.from({
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
