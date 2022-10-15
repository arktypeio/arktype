// import { assert } from "@arktype/assert"
// import { describe, test } from "mocha"
// import { space, type } from "../../index.js"

// describe("inheritable configs", () => {
// describe("methods", () => {
//     test("no config", () => {
//         assert(
//             type({ name: "string" }).check({
//                 name: "David Blass",
//                 age: 28
//             }).errors
//         ).is(undefined)
//     })
//     test("type options", () => {
//         const user = type(
//             { name: "string" },
//             {
//                 errors: { extraneousKeys: { enabled: true } }
//             }
//         )
//         assert(
//             user.check({ name: "David Blass", age: 28 }).errors?.summary
//         ).equals(`Key 'age' was unexpected`)
//     })
//     test("define config in space", () => {
//         const mySpace = space({
//             user: define(
//                 { name: "string" },
//                 {
//                     errors: { extraneousKeys: { enabled: true } }
//                 }
//             )
//         })
//         assert(
//             mySpace.user.check({
//                 name: "David Blass",
//                 age: 28
//             }).errors?.summary
//         ).equals(`Key 'age' was unexpected`)
//     })
//     test("space config", () => {
//         const mySpace = space(
//             { user: { name: "string" } },
//             {
//                 errors: { extraneousKeys: { enabled: true } }
//             }
//         )
//         assert(
//             mySpace.user.check({
//                 name: "David Blass",
//                 age: 28
//             }).errors?.summary
//         ).equals(`Key 'age' was unexpected`)
//     })
//     test("precedence", () => {
//         const nesting = space(
//             {
//                 doll: define(
//                     { contents: "doll" },
//                     { generate: { onRequiredCycle: "def" } }
//                 )
//             },
//             {
//                 generate: { onRequiredCycle: "space" }
//             }
//         )
//         const doll = nesting.$.type("doll", {
//             generate: { onRequiredCycle: "type" }
//         })
//         // When all four are provided, the options provided to the call win
//         assert(
//             doll.generate({ onRequiredCycle: "create" }).contents
//         ).unknown.equals("create")
//         // When no args are provided, options def config wins
//         assert(
//             nesting.$.type("doll").generate().contents
//         ).unknown.equals("def")
//         // When no type-specific config is provided, space config applies
//         assert(
//             space(
//                 { doll: { contents: "doll" } },
//                 { generate: { onRequiredCycle: "space" } }
//             ).doll.generate()
//         ).unknown.equals({ contents: "space" })
//         // When there is no other config, create options will apply
//         assert(
//             space({ doll: { contents: "doll" } })
//                 .$.type("doll", {
//                     generate: { onRequiredCycle: "create" }
//                 })
//                 .generate().contents
//         ).unknown.equals("create")
//     })
// })
//})
