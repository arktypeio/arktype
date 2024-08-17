import type { Module } from "../module.js"
import { scope } from "../scope.js"

const keywords: Module<arkJs.keywords> = scope(
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

export const arkJs = {
	keywords
}

export declare namespace arkJs {
	// ECMAScript Objects
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
	export interface keywords {
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
}
