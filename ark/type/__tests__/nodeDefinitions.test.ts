// describe("node definitions", () => {
//     describe("basis", () => {
//         it("domain", () => {
//             const t = node({
//                 basis: "string"
//             })
//             attest<TypeNode<string>>(t)
//         })
//         it("class", () => {
//             const t = node({
//                 basis: Date
//             })
//             attest<TypeNode<Date>>(t)
//         })
//         it("value", () => {
//             const t = node({
//                 basis: ["===", 3.14159]
//             })
//             attest<TypeNode<3.14159>>(t)
//         })
//     })
//     it("optional props", () => {
//         const t = node({
//             basis: "object",
//             props: {
//                 a: {
//                     value: { basis: "string" }
//                 },
//                 b: {
//                     optional: true,
//                     value: { basis: "number" }
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
//             basis: Array,
//             props: [
//                 {},
//                 {
//                     key: arrayIndexInput(),
//                     value: {
//                         basis: "object",
//                         props: {
//                             name: {
//                                 value: { basis: "string" }
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
//             basis: Array,
//             props: [
//                 {
//                     0: {
//                         value: { basis: "string" }
//                     },
//                     // works for numeric or string keys
//                     "1": {
//                         value: { basis: "number" }
//                     }
//                 },
//                 {
//                     key: arrayIndexInput(2),
//                     value: {
//                         basis: "symbol"
//                     }
//                 }
//             ]
//         })
//         attest<TypeNode<[string, number, ...symbol[]]>>(t)
//     })
//     it("non-variadic tuple", () => {
//         const t = node({
//             basis: Array,
//             props: {
//                 0: {
//                     value: {
//                         basis: "object",
//                         props: {
//                             a: { value: { basis: "string" } },
//                             b: { value: { basis: "number" } }
//                         }
//                     }
//                 },
//                 1: {
//                     value: {
//                         basis: ["===", "arktype"]
//                     }
//                 },
//                 length: {
//                     prerequisite: true,
//                     value: { basis: ["===", 2] }
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
//             { basis: ["===", "foo"] },
//             { basis: ["===", "bar"] },
//             { basis: "number" },
//             {
//                 basis: "object",
//                 props: { a: { value: { basis: "bigint" } } }
//             }
//         )
//         attest<TypeNode<number | "foo" | "bar" | { a: bigint }>>(t)
//     })
//     it("narrow", () => {
//         const t = node({
//             basis: "string",
//             narrow: (s): s is "foo" => s === "foo"
//         })
//         attest<TypeNode<"foo">>(t)
//     })
//     it("narrow array", () => {
//         const t = node({
//             basis: "object",
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
//             basis: "string",
//             morph: (s: string) => s.length
//         })
//         attest<TypeNode<(In: string) => Out<number>>>(t)
//     })
//     it("morph list", () => {
//         const t = node({
//             basis: "string",
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
//                 basis: "number",
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
//                 basis: ["===", true],
//                 // @ts-expect-error
//                 narrow: (b: boolean) => b === true
//             })
//         ).throws(
//             "narrow constraint may only be applied to a non-literal type (was true)"
//         )
//     })
// })
