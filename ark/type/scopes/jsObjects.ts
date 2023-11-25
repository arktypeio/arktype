import { schema } from "@arktype/schema"
import { Scope } from "../scope.js"
import type { RootScope } from "./ark.js"

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

export const jsObjects: RootScope<InferredJsObjects> = Scope.root({
	Function: schema(Function),
	Date: schema(Date),
	Error: schema(Error),
	Map: schema(Map),
	RegExp: schema(RegExp),
	Set: schema(Set),
	WeakMap: schema(WeakMap),
	WeakSet: schema(WeakSet),
	Promise: schema(Promise)
})

export const jsObjectsModule = jsObjects.export()
