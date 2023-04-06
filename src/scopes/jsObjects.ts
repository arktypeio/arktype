import type { Infer } from "../main.ts"
import type { inferObjectKind } from "../utils/objectKinds.ts"
import { scope } from "./scope.ts"

/**
 * @docgenScope
 * @docgenTable
 */
export const jsObjectsScope = scope(
    {
        Function: ["node", { object: { class: Function } }] as Infer<
            inferObjectKind<"Function">
        >,
        Date: ["node", { object: { class: Date } }],
        Error: ["node", { object: { class: Error } }],
        Map: ["node", { object: { class: Map } }],
        RegExp: ["node", { object: { class: RegExp } }],
        Set: ["node", { object: { class: Set } }],
        WeakMap: ["node", { object: { class: WeakMap } }],
        WeakSet: ["node", { object: { class: WeakSet } }],
        Promise: ["node", { object: { class: Promise } }]
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
