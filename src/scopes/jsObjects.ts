import { scope } from "./scope.ts"

export const jsObjectsScope = scope(
    {
        Function: ["node", { object: { class: "Function" } }],
        Array: ["node", { object: { class: "Array" } }],
        Date: ["node", { object: { class: "Date" } }],
        Error: ["node", { object: { class: "Error" } }],
        Map: ["node", { object: { class: "Map" } }],
        RegExp: ["node", { object: { class: "RegExp" } }],
        Set: ["node", { object: { class: "Set" } }],
        Object: ["node", { object: { class: "Object" } }],
        String: ["node", { object: { class: "String" } }],
        Number: ["node", { object: { class: "Number" } }],
        Boolean: ["node", { object: { class: "Boolean" } }],
        WeakMap: ["node", { object: { class: "WeakMap" } }],
        WeakSet: ["node", { object: { class: "WeakSet" } }],
        Promise: ["node", { object: { class: "Promise" } }]
    },
    { name: "jsObjects", standard: false }
)

export const jsObjects = jsObjectsScope.compile()
