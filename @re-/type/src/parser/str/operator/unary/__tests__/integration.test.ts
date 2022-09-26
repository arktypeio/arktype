// import { assert } from "@re-/assert"
// import { describe, test } from "mocha"
// import { type } from "../../../../../api.js"
// import { invalidSuffixMessage } from "../../../state/scanner.js"
// import { indivisibleMessage, invalidDivisorMessage } from "../modulo.js"

// describe("constraint integration", () => {
//     test("%,>", () => {
//         assert(type("number%10>2").ast).narrowedValue([
//             "number",
//             [
//                 ["%", 10],
//                 [">", 2]
//             ]
//         ])
//     })
//     test("<,%,<", () => {
//         assert(type("2<number%10<4").ast).narrowedValue([
//             "number",
//             [
//                 ["%", 10],
//                 [">", 2],
//                 ["<", 4]
//             ]
//         ])
//     })
// })

// describe("moduloValueFollowedByTwoCharSuffix", () => {
//     test("%,==", () => {
//         assert(type("number%2==0").ast).narrowedValue([
//             "number",
//             [
//                 ["%", 2],
//                 ["==", 0]
//             ]
//         ])
//     })
//     test("%,<=", () => {
//         assert(type("number%2<=4").ast).narrowedValue([
//             "number",
//             [
//                 ["%", 2],
//                 ["<=", 4]
//             ]
//         ])
//     })
//     test("%,>=", () => {
//         assert(type("number%2>=4").ast).narrowedValue([
//             "number",
//             [
//                 ["%", 2],
//                 [">=", 4]
//             ]
//         ])
//     })
//     test("<=,%,<=", () => {
//         assert(type("1<=number%2<=4").ast).narrowedValue([
//             "number",
//             [
//                 ["%", 2],
//                 [">=", 1],
//                 ["<=", 4]
//             ]
//         ])
//     })
// })
