import type { RootModule } from "../module.js"
import { schemaScope } from "../scope.js"

export interface jsObjectExports {
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

export type jsObjects = RootModule<jsObjectExports>

export const jsObjects: jsObjects = schemaScope(
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
	{ prereducedAliases: true, registerKeywords: true }
).export()
