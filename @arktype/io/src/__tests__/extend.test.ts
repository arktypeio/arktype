// import { assert } from "@arktype/assert"
// import { describe, test } from "mocha"
// import { space } from "../../index.js"

// describe("extend space", () => {
//     test("type", () => {
//         const extended = getExtendedSpace()
//         assert(extended.$.infer).typed as {
//             user: {
//                 first: string
//                 last: string
//             }
//             group: {
//                 members: {
//                     first: string
//                     last: string
//                 }[]
//             }
//             other: {
//                 groups: {
//                     members: {
//                         first: string
//                         last: string
//                     }[]
//                 }[]
//                 users: {
//                     first: string
//                     last: string
//                 }[]
//             }
//         }
//     })
//     test("dictionary", () => {
//         const extended = getExtendedSpace()
//         assert(extended.$.definitions).snap({
//             user: { first: `string`, last: `string` },
//             group: {
//                 // @ts-expect-error (values returned from define() don't match their declared types by design)
//                 $def: { members: `user[]` },
//                 $opts: {
//                     validate: {
//                         diagnostics: { extraneousKeys: { enabled: true } }
//                     }
//                 }
//             },
//             other: {
//                 // @ts-expect-error
//                 $def: { users: `user[]`, groups: `group[]` },
//                 $opts: {
//                     validate: {
//                         diagnostics: { extraneousKeys: { enabled: false } }
//                     }
//                 }
//             }
//         })
//     })
//     test("options", () => {
//         const extended = getExtendedSpace()
//         assert(extended.$.options).snap({
//             parse: {
//                 onCycle: "boolean"
//             },
//             errors: { extraneousKeys: { enabled: true } },
//             narrow: `<function validator>`
//         })
//     })
// })

// const getExtendedSpace = () => {
//     const mySpace = space(
//         {
//             user: { name: "string" },
//             group: define(
//                 { members: "user[]" },
//                 {
//                     errors: { extraneousKeys: { enabled: true } }
//                 }
//             )
//         },
//         {
//             parse: {
//                 onCycle: "number"
//             },
//             errors: { extraneousKeys: { enabled: false } },
//             narrow: () => undefined
//         }
//     )
//     const extended = mySpace.$.extend(
//         {
//             user: { first: "string", last: "string" },
//             other: define(
//                 { users: "user[]", groups: "group[]" },
//                 {
//                     errors: { extraneousKeys: { enabled: false } }
//                 }
//             )
//         },
//         {
//             parse: {
//                 onCycle: "boolean"
//             },
//             errors: { extraneousKeys: { enabled: true } }
//         }
//     )
//     return extended
// }
