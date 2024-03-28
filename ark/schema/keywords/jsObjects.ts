import type { TypeNode } from "../base.js"
import { space } from "../space.js"

export interface jsObjects {
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
