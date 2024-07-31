import type { Module } from "../module.js"
import { scope } from "../scope.js"

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

export type jsObjects = Module<jsObjectExports>

export const jsObjects: jsObjects = scope(
	{
		Array: ["instanceof", Array],
		Date: ["instanceof", Date],
		Error: ["instanceof", Error],
		Function: ["instanceof", Function],
		Map: ["instanceof", Map],
		RegExp: ["instanceof", RegExp],
		Set: ["instanceof", Set],
		WeakMap: ["instanceof", WeakMap],
		WeakSet: ["instanceof", WeakSet],
		Promise: ["instanceof", Promise]
	},
	{ prereducedAliases: true }
).export()
