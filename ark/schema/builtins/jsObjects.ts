import type { Schema } from "../schema.js"
import { SchemaScope } from "../scope.js"

export interface JsObjectSchemas {
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

export const jsObjects: SchemaScope<JsObjectSchemas> = SchemaScope.from({
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
