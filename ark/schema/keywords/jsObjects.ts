import { space } from "../space.js"
import type { spaceFromExports } from "./utils/utils.js"

export namespace jsObjects {
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
}

export type jsObjects = spaceFromExports<jsObjects.exports>

export const jsObjects: jsObjects = space(
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
