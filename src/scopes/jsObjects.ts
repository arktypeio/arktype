import { TypeNode } from "../nodes/type.js"
import { scope } from "../scope.js"

/**
 * @docgenScope
 * @docgenTable
 */
export const jsObjectsScope = scope(
    {
        Function: TypeNode.from({
            base: Function
        }),
        Date: TypeNode.from({ base: Date }),
        Error: TypeNode.from({ base: Error }),
        Map: TypeNode.from({ base: Map }),
        RegExp: TypeNode.from({ base: RegExp }),
        Set: TypeNode.from({ base: Set }),
        WeakMap: TypeNode.from({ base: WeakMap }),
        WeakSet: TypeNode.from({ base: WeakSet }),
        Promise: TypeNode.from({ base: Promise })
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
