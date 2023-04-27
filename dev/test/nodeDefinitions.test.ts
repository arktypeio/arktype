// import { describe, it } from "mocha"
// import type { Type } from "../../src/main.js"
// import { scope, type } from "../../src/main.js"
// import { attest } from "../attest/main.js"

// describe("node definitions", () => {
//     it("base", () => {
//         const t = type(["node", { string: true }])
//         attest(t.node).snap({ string: true })
//     })
//     it("alias", () => {
//         const types = scope({
//             a: ["node", { object: { props: { b: "b" } } }],
//             b: "boolean"
//         }).compile()
//         attest(types.a).typed as Type<{ b: boolean }>
//     })
//     it("literals", () => {
//         const t = type([
//             "node",
//             // for now, requires as const, downcast, or similar
//             {
//                 string: { value: "foo" },
//                 number: { value: 3.14159 },
//                 object: { value: { k: "v" } }
//             } as const
//         ])
//         attest(t.infer).typed as
//             | "foo"
//             | 3.14159
//             | {
//                   k: "v"
//               }
//     })
//     it("optional props", () => {
//         const t = type([
//             "node",
//             {
//                 object: {
//                     props: {
//                         a: "string",
//                         b: ["?", "boolean"]
//                     }
//                 }
//             }
//         ])
//         attest(t.infer).typed as {
//             a: string
//             b?: boolean
//         }
//     })
//     it("arrays", () => {
//         const t = type([
//             "node",
//             {
//                 object: {
//                     class: Array,
//                     props: {
//                         "[index]": { object: { props: { name: "string" } } }
//                     }
//                 }
//             }
//         ])
//         attest(t.infer).typed as { name: string }[]
//     })
//     it("tuples", () => {
//         const t = type([
//             "node",
//             {
//                 object: {
//                     class: Array,
//                     props: {
//                         "[index]": "string",
//                         length: { number: { value: 5 } }
//                     }
//                 }
//             } as const
//         ])
//         attest(t.infer).typed as [string, string, string, string, string]
//     })
//     it("branches", () => {
//         const t = type([
//             "node",
//             {
//                 string: [{ value: "foo" }, { value: "bar" }],
//                 boolean: true,
//                 object: [
//                     { props: { a: "string" } },
//                     { class: Array, props: { "[index]": "number" } }
//                 ]
//             } as const
//         ])
//         attest(t.infer).typed as
//             | boolean
//             | "foo"
//             | "bar"
//             | {
//                   a: string
//               }
//             | number[]
//     })
//     it("morph", () => {
//         const t = type([
//             "node",
//             {
//                 object: {
//                     rules: { props: { a: "string" } },
//                     morph: (input: { a: string }) => ({
//                         b: input.a.length
//                     })
//                 }
//             }
//         ])
//         attest(t).typed as Type<
//             (In: { a: string }) => {
//                 b: number
//             }
//         >
//     })
//     it("never", () => {
//         const t = type(["node", {}])
//         attest(t({}).problems?.summary).snap("Must be never (was {})")
//     })
//     it("doesn't evaluate builtins", () => {
//         const t = type([
//             "node",
//             {
//                 object: {
//                     instance: Date
//                 }
//             }
//         ])
//         attest(t.infer).type.toString("Date")
//     })
//     it("helper", () => {
//         const t = type.from({ string: true })
//         attest(t.infer).typed as string
//         attest(t.node).snap({ string: true })
//     })
//     describe("errors", () => {
//         // NOTE: these won't throw at runtime because nodes are assumed valid
//         it("bad shallow reference", () => {
//             // @ts-expect-error
//             attest(() => type(["node", "whoops"])).type.errors(
//                 `Type 'string' is not assignable to type 'ResolvedNode<PrecompiledDefaults>'`
//             )
//         })
//         it("bad prop reference", () => {
//             attest(() =>
//                 type([
//                     "node",
//                     {
//                         // @ts-expect-error
//                         object: {
//                             props: {
//                                 a: "whoops"
//                             }
//                         }
//                     }
//                 ])
//             ).type.errors(
//                 `Type '"whoops"' is not assignable to type 'Prop<PrecompiledDefaults, Node<PrecompiledDefaults>>'`
//             )
//         })
//         it("rule in wrong domain", () => {
//             attest(() =>
//                 type([
//                     "node",
//                     {
//                         number: {
//                             // @ts-expect-error
//                             regex: "/.*/"
//                         }
//                     }
//                 ])
//             ).type.errors(
//                 `'regex' does not exist in type 'CollapsibleList<Branch<"number", PrecompiledDefaults>>'`
//             )
//         })
//         it("helper error", () => {
//             // @ts-expect-error
//             attest(() => type.from({ number: { regex: /.*/ } })).type.errors(
//                 `'regex' does not exist in type 'CollapsibleList<Branch<"number", PrecompiledDefaults>>'`
//             )
//         })
//     })
// })
