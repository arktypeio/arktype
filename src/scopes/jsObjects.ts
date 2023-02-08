import { scope } from "./scope.ts"

export const jsObjectsScope = scope(
    {
        Function: ["node", { object: { objectKind: "Function" } }],
        Array: ["node", { object: { objectKind: "Array" } }],
        Date: ["node", { object: { objectKind: "Date" } }],
        Error: ["node", { object: { objectKind: "Error" } }],
        Map: ["node", { object: { objectKind: "Map" } }],
        RegExp: ["node", { object: { objectKind: "RegExp" } }],
        Set: ["node", { object: { objectKind: "Set" } }],
        Object: ["node", { object: { objectKind: "Object" } }],
        String: ["node", { object: { objectKind: "String" } }],
        Number: ["node", { object: { objectKind: "Number" } }],
        Boolean: ["node", { object: { objectKind: "Boolean" } }],
        WeakMap: ["node", { object: { objectKind: "WeakMap" } }],
        WeakSet: ["node", { object: { objectKind: "WeakSet" } }],
        Promise: ["node", { object: { objectKind: "Promise" } }]
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
