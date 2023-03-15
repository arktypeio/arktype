import type { Infer } from "../main.ts"
import type { inferObjectKind } from "../utils/objectKinds.ts"
import { scope } from "./scope.ts"

/**
 * @scope
 * @descriptions descriptions: { "Object": "an object","Array": "an array","Function": "a function", "Date": "a Date","RegExp": "a RegExp","Error": "an Error","Map": "a Map","Set": "a Set","String": "a String object","Number": "a Number object","Boolean": "a Boolean object","Promise": "a Promise","WeakMap": "a WeakMap","WeakSet": "a WeakSet" }
 */
export const jsObjectsScope = scope(
    {
        Function: ["node", { object: { class: Function } }] as Infer<
            inferObjectKind<"Function">
        >,
        Array: ["node", { object: { class: Array } }],
        Date: ["node", { object: { class: Date } }],
        Error: ["node", { object: { class: Error } }],
        Map: ["node", { object: { class: Map } }],
        RegExp: ["node", { object: { class: RegExp } }],
        Set: ["node", { object: { class: Set } }],
        Object: ["node", { object: { class: Object } }] as Infer<
            inferObjectKind<"Object">
        >,
        String: ["node", { object: { class: String } }],
        Number: ["node", { object: { class: Number } }],
        Boolean: ["node", { object: { class: Boolean } }],
        WeakMap: ["node", { object: { class: WeakMap } }],
        WeakSet: ["node", { object: { class: WeakSet } }],
        Promise: ["node", { object: { class: Promise } }]
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
