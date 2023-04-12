import type { Infer } from "../main.js"
import { TypeNode } from "../nodes/type.js"
import { scope } from "../scope.js"
import type { inferObjectKind } from "../utils/objectKinds.js"

/**
 * @docgenScope
 * @docgenTable
 */
export const jsObjectsScope = scope(
    {
        Function: TypeNode.from({
            domain: "object",
            instance: Function
        }),
        Date: TypeNode.from({ domain: "object", instance: Date }),
        Error: TypeNode.from({ domain: "object", instance: Error }),
        Map: TypeNode.from({ domain: "object", instance: Map }),
        RegExp: TypeNode.from({ domain: "object", instance: RegExp }),
        Set: TypeNode.from({ domain: "object", instance: Set }),
        WeakMap: TypeNode.from({ domain: "object", instance: WeakMap }),
        WeakSet: TypeNode.from({ domain: "object", instance: WeakSet }),
        Promise: TypeNode.from({ domain: "object", instance: Promise })
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
