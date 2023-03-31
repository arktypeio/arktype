import type { Infer } from "../main.ts"
import type { inferObjectKind } from "../utils/objectKinds.ts"
import { scope } from "./scope.ts"

/**
 * @docgenScope
 * @docgenTable
 */
export const jsObjectsScope = scope(
    {
        Function: ["node", { object: { instance: Function } }] as Infer<
            inferObjectKind<"Function">
        >,
        Array: ["node", { object: { instance: Array } }],
        Date: ["node", { object: { instance: Date } }],
        Error: ["node", { object: { instance: Error } }],
        Map: ["node", { object: { instance: Map } }],
        RegExp: ["node", { object: { instance: RegExp } }],
        Set: ["node", { object: { instance: Set } }],
        Object: ["node", { object: { instance: Object } }] as Infer<
            inferObjectKind<"Object">
        >,
        String: ["node", { object: { instance: String } }],
        Number: ["node", { object: { instance: Number } }],
        Boolean: ["node", { object: { instance: Boolean } }],
        WeakMap: ["node", { object: { instance: WeakMap } }],
        WeakSet: ["node", { object: { instance: WeakSet } }],
        Promise: ["node", { object: { instance: Promise } }]
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
