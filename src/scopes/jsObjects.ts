import type { Infer } from "../main.js"
import { node } from "../nodes/node.js"
import { scope } from "../scope.js"
import type { inferObjectKind } from "../utils/objectKinds.js"

/**
 * @docgenScope
 * @docgenTable
 */
export const jsObjectsScope = scope(
    {
        Function: node({ domain: "object", instance: Function }) as Infer<
            inferObjectKind<"Function">
        >,
        Date: node({ domain: "object", instance: Date }),
        Error: node({ domain: "object", instance: Error }),
        Map: node({ domain: "object", instance: Map }),
        RegExp: node({ domain: "object", instance: RegExp }),
        Set: node({ domain: "object", instance: Set }),
        WeakMap: node({ domain: "object", instance: WeakMap }),
        WeakSet: node({ domain: "object", instance: WeakSet }),
        Promise: node({ domain: "object", instance: Promise })
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
