import type { TypeNode } from "../base.js"
import { ScopeNode } from "../scope.js"

export namespace JsObjects {
	export interface resolutions {
		Array: TypeNode<Array<unknown>, "proto">
		Function: TypeNode<Function, "proto">
		Date: TypeNode<Date, "proto">
		Error: TypeNode<Error, "proto">
		Map: TypeNode<Map<unknown, unknown>, "proto">
		RegExp: TypeNode<RegExp, "proto">
		Set: TypeNode<Set<unknown>, "proto">
		WeakMap: TypeNode<WeakMap<object, unknown>, "proto">
		WeakSet: TypeNode<WeakSet<object>, "proto">
		Promise: TypeNode<Promise<unknown>, "proto">
	}

	export type infer = (typeof JsObjects)["infer"]
}

export const JsObjects: ScopeNode<JsObjects.resolutions> = ScopeNode.from(
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

ScopeNode.jsObjects = JsObjects.resolutions
