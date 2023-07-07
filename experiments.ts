/* eslint-disable @typescript-eslint/no-restricted-imports */
// @ts-ignore
// import { scope } from "./src/main.js"
// import { arrayIndexTypeNode } from "./src/nodes/properties/indexed.js"

import type { Constraint } from "./src/nodes/predicate/predicate.js"
import type { BasisInput } from "./src/nodes/primitive/basis.js"

// // TODO: reduce this case or create an issue
// const $ = scope({
//     user: {
//         friends: "user[]",
//         name: "string"
//     },
//     admin: {
//         friends: "user[]",
//         name: "string"
//     }
// })

// console.log("ok")

// const types = $.export()

// types.user.root.alias //?

// types.admin.root.alias //?

// const result = types.user.root.getPath("friends", arrayIndexTypeNode())

// result.alias //?

// $.compile() //?

export const node = (...args: any[]) => [] as any

node("string", { description: "a string" })

type PredicateInput = unknown[]

const input: PredicateInput = [
    Array,
    { bound: [">", 5] },
    { bound: ["<", 10], meta: { description: "greater than 10" } },
    { props: { a: "string" } },
    { description: "an array" }
]

node(
    Array,
    { kind: "props", rule: { a: "string" } },
    { description: "an array" }
)

node("===", 5, { description: "5" })
