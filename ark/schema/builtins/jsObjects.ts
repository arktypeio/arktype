import { SchemaScope } from "../scope.js"

export interface InferredJsObjects {
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

export const jsObjects: SchemaScope<InferredJsObjects> = SchemaScope.from({
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
