import { attest } from "@arktype/attest"
import { suite, test } from "mocha"
import { scope, type } from "arktype"

suite("config traversal", () => {
	// test("tuple expression", () => {
	//     const mustBe = "a series of characters"
	//     const types = scope({
	//         a: ["string", ":", { mustBe }],
	//         b: {
	//             a: "a"
	//         }
	//     }).compile()
	//     attest(types.a.infer).typed as string
	//     // attest(types.a.flat).snap([
	//     //     [
	//     //         "config",
	//     //         {
	//     //             config: [["mustBe", "a series of characters"]],
	//     //             node: "string"
	//     //         }
	//     //     ]
	//     // ])
	//     attest(types.a(1).problems?.summary).snap(
	//         "Must be a series of characters (was number)"
	//     )
	//     attest(types.b.infer).typed as { a: string }
	//     // attest(types.b.flat).equals([
	//     //     ["domain", "object"],
	//     //     [
	//     //         "requiredProp",
	//     //         [
	//     //             "a",
	//     //             [
	//     //                 [
	//     //                     "config",
	//     //                     {
	//     //                         config: [["mustBe", mustBe]],
	//     //                         node: "string"
	//     //                     }
	//     //                 ]
	//     //             ]
	//     //         ]
	//     //     ]
	//     // ])
	//     attest(types.b({ a: true }).problems?.summary).snap(
	//         "a must be a series of characters (was boolean)"
	//     )
	// })
	// test("tuple expression at path", () => {
	//     const t = type({
	//         monster: [
	//             "196883",
	//             ":",
	//             {
	//                 mustBe: "the number of dimensions in the monster group"
	//             }
	//         ]
	//     })
	//     attest(t.infer).typed as { monster: 196883 }
	//     // attest(t.node).snap({
	//     //     object: {
	//     //         props: {
	//     //             monster: {
	//     //                 node: { number: { value: 196883 } },
	//     //                 config: {
	//     //                     mustBe: "the number of dimensions in the monster group"
	//     //                 }
	//     //             }
	//     //         }
	//     //     }
	//     // })
	//     // attest(t.flat).snap([
	//     //     ["domain", "object"],
	//     //     [
	//     //         "requiredProp",
	//     //         [
	//     //             "monster",
	//     //             [
	//     //                 [
	//     //                     "config",
	//     //                     {
	//     //                         config: [
	//     //                             [
	//     //                                 "mustBe",
	//     //                                 "the number of dimensions in the monster group"
	//     //                             ]
	//     //                         ],
	//     //                         node: [["value", 196883]]
	//     //                     }
	//     //                 ]
	//     //             ]
	//     //         ]
	//     //     ]
	//     // ])
	//     attest(t({ monster: 196882 }).problems?.summary).snap(
	//         "monster must be the number of dimensions in the monster group (was 196882)"
	//     )
	// })
	// test("anonymous type config", () => {
	//     const t = type(type("true", { mustBe: "unfalse" }))
	//     attest(t.infer).typed as true
	//     // attest(t.flat).snap([
	//     //     [
	//     //         "config",
	//     //         { config: [["mustBe", "unfalse"]], node: [["value", true]] }
	//     //     ]
	//     // ])
	//     attest(t(false).problems?.summary).snap("Must be unfalse (was false)")
	// })
	// test("anonymous type config at path", () => {
	//     const unfalse = type("true", { mustBe: "unfalse" })
	//     const t = type({ myKey: unfalse })
	//     // attest(t.flat).snap([
	//     //     ["domain", "object"],
	//     //     [
	//     //         "requiredProp",
	//     //         [
	//     //             "myKey",
	//     //             [
	//     //                 [
	//     //                     "config",
	//     //                     {
	//     //                         config: [["mustBe", "unfalse"]],
	//     //                         node: [["value", true]]
	//     //                     }
	//     //                 ]
	//     //             ]
	//     //         ]
	//     //     ]
	//     // ])
	//     attest(t({ myKey: "500" }).problems?.summary).snap(
	//         "myKey must be unfalse (was '500')"
	//     )
	//     // config only applies within myKey
	//     attest(t({ yourKey: "500" }).problems?.summary).snap(
	//         "myKey must be defined"
	//     )
	// })
	// test("anonymous type thunk", () => {
	//     const t = type(() => type("false", { mustBe: "untrue" }))
	//     attest(t.infer).typed as false
	//     // attest(t.flat).snap([
	//     //     [
	//     //         "config",
	//     //         { config: [["mustBe", "untrue"]], node: [["value", false]] }
	//     //     ]
	//     // ])
	// })
	// test("anonymous type thunk at path", () => {
	//     const t = type({ myKey: () => type("false", { mustBe: "untrue" }) })
	//     attest(t.infer).typed as { myKey: false }
	//     // attest(t.flat).snap([
	//     //     ["domain", "object"],
	//     //     [
	//     //         "requiredProp",
	//     //         [
	//     //             "myKey",
	//     //             [
	//     //                 [
	//     //                     "config",
	//     //                     {
	//     //                         config: [["mustBe", "untrue"]],
	//     //                         node: [["value", false]]
	//     //                     }
	//     //                 ]
	//     //             ]
	//     //         ]
	//     //     ]
	//     // ])
	// })
})
