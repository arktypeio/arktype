import { node } from "@arktype/schema"
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
	Function: node(Function),
	Date: node(Date),
	Error: node(Error),
	Map: node(Map),
	RegExp: node(RegExp),
	Set: node(Set),
	WeakMap: node(WeakMap),
	WeakSet: node(WeakSet),
	Promise: node(Promise)
})

export const jsObjectTypes = jsObjects.export()
