// import { assert } from "@re-/assert"
// import { describe, test } from "mocha"
// import { space } from "../../index.js"

// const getSpace = () =>
//     space({
//         user: define({
//             name: "name"
//         }),
//         group: define(
//             {
//                 members: "user[]"
//             },
//             { errors: { extraneousKeys: { enabled: true } } }
//         ),
//         name: {
//             first: "string",
//             last: "string"
//         }
//     })

// describe("def", () => {
//     test("doesn't change the type of string defs", () => {
//         const types = getSpace()
//         assert(types.$root.infer).typed as {
//             user: {
//                 name: {
//                     first: string
//                     last: string
//                 }
//             }
//             group: {
//                 members: {
//                     name: {
//                         first: string
//                         last: string
//                     }
//                 }[]
//             }
//             name: {
//                 first: string
//                 last: string
//             }
//         }
//     })
//     test("applies type-specific options", () => {
//         const types = getSpace()
//         const name = { first: "tsrif", last: "tsal" }
//         const age = 27
//         const validUserWithExtraKey = {
//             name,
//             age
//         }
//         const invalidPropSwappedUser = {
//             name: age,
//             age: name
//         }
//         assert(types.user.check(validUserWithExtraKey).data).unknown.equals(
//             validUserWithExtraKey
//         ).typed as
//             | {
//                   name: {
//                       first: string
//                       last: string
//                   }
//               }
//             | undefined
//         // TODO: Aliases- age should not be reported.
//         assert(
//             types.group.check({
//                 members: [validUserWithExtraKey, invalidPropSwappedUser],
//                 // No extraneous keys is enabled for group, so description is not allowed
//                 description: "Typescript Devs"
//             }).errors?.summary
//         ).snap(`Encountered errors at the following paths:
//   members/0: Key 'age' was unexpected
//   members/1/name: Must be a non-array object (was non-object)
//   members/1: Key 'age' was unexpected
//   /: Key 'description' was unexpected
// `)
//     })
// })
