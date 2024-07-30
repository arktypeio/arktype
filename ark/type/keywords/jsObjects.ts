import type { Constructor } from "@ark/util"
import type { SchemaModule } from "../module.js"
import { schemaScope } from "../scope.js"

// ECMAScript Objects
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export interface jsObjectExports {
	Array: Array<unknown>
	Date: Date
	Error: Error
	Function: Function
	Map: Map<unknown, unknown>
	RegExp: RegExp
	Set: Set<unknown>
	WeakMap: WeakMap<object, unknown>
	WeakSet: WeakSet<object>
	Promise: Promise<unknown>
}

export type jsObjects = SchemaModule<jsObjectExports>

export const jsObjects: jsObjects = schemaScope(
	{
		Array,
		Date,
		Error,
		Function,
		Map,
		RegExp,
		Set,
		WeakMap,
		WeakSet,
		Promise
	} satisfies { [k in keyof jsObjectExports]: Constructor<jsObjectExports[k]> },
	{ prereducedAliases: true, intrinsic: true }
).export()
