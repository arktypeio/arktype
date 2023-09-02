import { predicate } from "@arktype/schema"
import { Scope } from "../scope.js"
import type { RootScope } from "./ark.js"

export type InferredJsObjects = {
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
	Function: predicate({ basis: Function }),
	Date: predicate({ basis: Date }),
	Error: predicate({ basis: Error }),
	Map: predicate({ basis: Map }),
	RegExp: predicate({ basis: RegExp }),
	Set: predicate({ basis: Set }),
	WeakMap: predicate({ basis: WeakMap }),
	WeakSet: predicate({ basis: WeakSet }),
	Promise: predicate({ basis: Promise })
})

export const jsObjectTypes = jsObjects.export()
