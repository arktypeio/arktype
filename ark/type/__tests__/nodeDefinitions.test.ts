// describe("node definitions", () => {
//     describe("basis", () => {
//         it("domain", () => {
//             const t = node({
//                 domain: "string"
//             })
//             attest<TypeNode<string>>(t)
//         })
//         it("class", () => {
//             const t = node({
//                 domain: Date
//             })
//             attest<TypeNode<Date>>(t)
//         })
//         it("value", () => {
//             const t = node({
//                 domain: ["===", 3.14159]
//             })
//             attest<TypeNode<3.14159>>(t)
//         })
//     })
//     it("optional props", () => {
//         const t = node({
//             domain: "object",
//             props: {
//                 a: {
//                     value: { domain: "string" }
//                 },
//                 b: {
//                     optional: true,
//                     value: { domain: "number" }
//                 }
//             }
//         })
//         attest<TypeNode<{>(t)
//             a: string
//             b?: boolean
//         }>
//     })
//     it("arrays", () => {
//         const t = node({
//             proto: Array,
//             props: [
//                 {},
//                 {
//                     key: arrayIndexInput(),
//                     value: {
//                         domain: "object",
//                         props: {
//                             name: {
//                                 value: { domain: "string" }
//                             }
//                         }
//                     }
//                 }
//             ]
//         })
//         attest<TypeNode<{ name: string }[]>>(t)
//     })
//     it("variadic tuple", () => {
//         const t = node({
//             proto: Array,
//             props: [
//                 {
//                     0: {
//                         value: { domain: "string" }
//                     },
//                     // works for numeric or string keys
//                     "1": {
//                         value: { domain: "number" }
//                     }
//                 },
//                 {
//                     key: arrayIndexInput(2),
//                     value: {
//                         domain: "symbol"
//                     }
//                 }
//             ]
//         })
//         attest<TypeNode<[string, number, ...symbol[]]>>(t)
//     })
//     it("non-variadic tuple", () => {
//         const t = node({
//             proto: Array,
//             props: {
//                 0: {
//                     value: {
//                         domain: "object",
//                         props: {
//                             a: { value: { domain: "string" } },
//                             b: { value: { domain: "number" } }
//                         }
//                     }
//                 },
//                 1: {
//                     value: {
//                         domain: ["===", "arktype"]
//                     }
//                 },
//                 length: {
//                     prerequisite: true,
//                     value: { domain: ["===", 2] }
//                 }
//             }
//         })
//         attest<TypeNode<>(t)
//             [
//                 {
//                     a: string
//                     b: number
//                 },
//                 "arktype"
//             ]
//         >
//     })
//     it("branches", () => {
//         const t = node(
//             { domain: ["===", "foo"] },
//             { domain: ["===", "bar"] },
//             { domain: "number" },
//             {
//                 domain: "object",
//                 props: { a: { value: { domain: "bigint" } } }
//             }
//         )
//         attest<TypeNode<number | "foo" | "bar" | { a: bigint }>>(t)
//     })
//     it("narrow", () => {
//         const t = node({
//             domain: "string",
//             narrow: (s): s is "foo" => s === "foo"
//         })
//         attest<TypeNode<"foo">>(t)
//     })
//     it("narrow array", () => {
//         const t = node({
//             domain: "object",
//             narrow: [
//                 (o): o is { a: string } => typeof o.a === "string",
//                 (o): o is { b: boolean } => typeof o.b === "boolean"
//             ] as const
//         })
//         attest<TypeNode<{>(t)
//             a: string
//             b: boolean
//         }>
//     })
//     it("morph", () => {
//         const t = node({
//             domain: "string",
//             morph: (s: string) => s.length
//         })
//         attest<TypeNode<(In: string) => Out<number>>>(t)
//     })
//     it("morph list", () => {
//         const t = node({
//             domain: "string",
//             morph: [(s: string) => s.length, (n: number) => ({ n })] as const
//         })
//         attest<TypeNode<(In: string) => Out<{ n: number }>>>(t)
//     })
//     it("never", () => {
//         const t = node()
//         attest<TypeNode<never>>(t)
//     })
//     it("errors on rule in wrong domain", () => {
//         attest(() =>
//             node({
//                 domain: "number",
//                 divisor: 5,
//                 // @ts-expect-error
//                 regex: "/.*/"
//             })
//         ).throws.snap(
//             "Error: regex constraint may only be applied to a string (was number)"
//         )
//     })
//     it("errors on filter literal", () => {
//         attest(() =>
//             node({
//                 domain: ["===", true],
//                 // @ts-expect-error
//                 narrow: (b: boolean) => b === true
//             })
//         ).throws(
//             "narrow constraint may only be applied to a non-literal type (was true)"
//         )
//     })
// })
