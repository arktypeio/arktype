import { TypeNode } from "../nodes/type.js"
import { scope } from "../scope.js"

/**
 * @docgenScope
 * @docgenTable
 */
export const jsObjectsScope = scope(
    {
        Function: TypeNode.from({
            instanceOf: Function
        }),
        Date: TypeNode.from({ instanceOf: Date }),
        Error: TypeNode.from({ instanceOf: Error }),
        Map: TypeNode.from({ instanceOf: Map }),
        RegExp: TypeNode.from({ instanceOf: RegExp }),
        Set: TypeNode.from({ instanceOf: Set }),
        WeakMap: TypeNode.from({ instanceOf: WeakMap }),
        WeakSet: TypeNode.from({ instanceOf: WeakSet }),
        Promise: TypeNode.from({ instanceOf: Promise })
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
