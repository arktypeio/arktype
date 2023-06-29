import { node } from "../nodes/composite/type.js"
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
    Function: node({ basis: Function }),
    Date: node({ basis: Date }),
    Error: node({ basis: Error }),
    Map: node({ basis: Map }),
    RegExp: node({ basis: RegExp }),
    Set: node({ basis: Set }),
    WeakMap: node({ basis: WeakMap }),
    WeakSet: node({ basis: WeakSet }),
    Promise: node({ basis: Promise })
})

export const jsObjectTypes = jsObjects.export()
