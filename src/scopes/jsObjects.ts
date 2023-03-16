import type { Infer } from "../main.ts"
import type { inferObjectKind } from "../utils/objectKinds.ts"
import { scope } from "./scope.ts"

export const jsObjectsScope = scope(
    {
        Function: ["node", { object: { instanceOf: Function } }] as Infer<
            inferObjectKind<"Function">
        >,
        Array: ["node", { object: { instanceOf: Array } }],
        Date: ["node", { object: { instanceOf: Date } }],
        Error: ["node", { object: { instanceOf: Error } }],
        Map: ["node", { object: { instanceOf: Map } }],
        RegExp: ["node", { object: { instanceOf: RegExp } }],
        Set: ["node", { object: { instanceOf: Set } }],
        Object: ["node", { object: { instanceOf: Object } }] as Infer<
            inferObjectKind<"Object">
        >,
        String: ["node", { object: { instanceOf: String } }],
        Number: ["node", { object: { instanceOf: Number } }],
        Boolean: ["node", { object: { instanceOf: Boolean } }],
        WeakMap: ["node", { object: { instanceOf: WeakMap } }],
        WeakSet: ["node", { object: { instanceOf: WeakSet } }],
        Promise: ["node", { object: { instanceOf: Promise } }]
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
