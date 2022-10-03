import type { Evaluate } from "@re-/tools"
import type { Bound } from "../expression/bound.js"
import type { Divisibility } from "../expression/divisibility.js"
import type { TypeKeyword } from "../terminal/keyword/keyword.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { RegexKeyword, RegexLiteral } from "../terminal/regex.js"

export namespace Ast {
    export type Infer<Ast, Resolutions> = Ast extends string
        ? InferTerminal<Ast, Resolutions>
        : Ast extends readonly unknown[]
        ? Ast[1] extends "?"
            ? Infer<Ast[0], Resolutions> | undefined
            : Ast[1] extends "[]"
            ? Infer<Ast[0], Resolutions>[]
            : Ast[1] extends "|"
            ? Infer<Ast[0], Resolutions> | Infer<Ast[2], Resolutions>
            : Ast[1] extends "&"
            ? Evaluate<Infer<Ast[0], Resolutions> & Infer<Ast[2], Resolutions>>
            : Ast[1] extends ConstraintToken
            ? Infer<Ast[0], Resolutions>
            : // If the value at index 1 was none of the above, it's a normal tuple definition
              Evaluate<{
                  [I in keyof Ast]: Infer<Ast[I], Resolutions>
              }>
        : InferObjectLiteral<Ast, Resolutions>

    type ConstraintToken = Bound.Token | Divisibility.Token

    type InferTerminal<
        Token extends string,
        Resolutions
    > = Token extends TypeKeyword.Definition
        ? TypeKeyword.Infer<Token>
        : Token extends keyof Resolutions
        ? Infer<Resolutions[Token], Resolutions>
        : Token extends PrimitiveLiteral.String<infer Text>
        ? Text
        : Token extends RegexLiteral.Definition | RegexKeyword.Definition
        ? string
        : Token extends PrimitiveLiteral.Number<infer Value>
        ? Value
        : Token extends PrimitiveLiteral.Bigint<infer Value>
        ? Value
        : Token extends PrimitiveLiteral.Boolean<infer Value>
        ? Value
        : unknown

    type InferObjectLiteral<
        Ast,
        Resolutions,
        OptionalKey extends keyof Ast = {
            [K in keyof Ast]: Ast[K] extends [unknown, "?"] ? K : never
        }[keyof Ast],
        RequiredKey extends keyof Ast = Exclude<keyof Ast, OptionalKey>
    > = Evaluate<
        {
            [K in RequiredKey]: Infer<Ast[K], Resolutions>
        } & {
            [K in OptionalKey]?: Infer<Ast[K], Resolutions>
        }
    >
}

// import { assert } from "@re-/assert"
// import type { ElementOf } from "@re-/tools"
// import { isNumeric, narrow } from "@re-/tools"
// import { describe, test } from "mocha"
// import { space, type } from "../../api.js"

// describe("references", () => {
//     const objectDef = narrow({
//         strings: {
//             keyword: "boolean",
//             expression: "string[]|integer?"
//         },
//         listed: ["-1n", "null", "string|boolean"],
//         regex: `/.*/`
//     })

//     const expectedObjectDefReferences = narrow([
//         "/.*/",
//         "-1n",
//         "null",
//         "string",
//         "boolean",
//         "integer"
//     ])

//     type ExpectedObjectDefReferenceTuple = typeof expectedObjectDefReferences

//     type ExpectedObjectDefReferenceUnion =
//         ElementOf<ExpectedObjectDefReferenceTuple>

//     type ExpectedObjectDefReferenceList = ExpectedObjectDefReferenceUnion[]

//     describe("model", () => {
//         test("from string", () => {
//             const references = space({ user: "unknown", group: "unknown" })
//                 .$root.type("0<(user[]|group[]|boolean&true|integer|null)[]<2")
//                 .references()
//             const expectedReferenceSet = narrow([
//                 "user",
//                 "group",
//                 "boolean",
//                 "true",
//                 "integer",
//                 "null"
//             ])
//             type ExpectedReferences = ElementOf<typeof expectedReferenceSet>[]
//             assert(references).equals(expectedReferenceSet, {
//                 listComparison: "permutable"
//             }).typed as ExpectedReferences
//         })
//         test("from string with duplicates", () => {
//             const zeroAndOne = type("0|1|0[]|1[]|0[][]|1[][]?").references()
//             assert(zeroAndOne).equals(["0", "1"]).typed as ("0" | "1")[]
//         })
//         test("from object", () => {
//             const references = type(objectDef).references()
//             assert(references).equals(expectedObjectDefReferences, {
//                 listComparison: "permutable"
//             }).typed as ExpectedObjectDefReferenceList
//         })
//         test("filter", () => {
//             const referencesIncludingE = type(objectDef).references({
//                 filter: (reference) => reference.includes("e")
//             })
//             assert(referencesIncludingE).equals(["integer", "boolean"], {
//                 listComparison: "permutable"
//             }).typed as ExpectedObjectDefReferenceList
//         })
//         test("typed filter", () => {
//             const bigintLiteralReferences = type(objectDef).references({
//                 filter: (reference): reference is `${number}n` =>
//                     isNumeric(reference.slice(0, -1)) &&
//                     reference.slice(-1) === "n"
//             })
//             assert(bigintLiteralReferences).equals(["-1n"], {
//                 listComparison: "permutable"
//             }).typed as "-1n"[]
//         })
//     })
// })

// import type { Bound } from "../../nonTerminal/binary/bound.js"
// import type { Divisibility } from "../../nonTerminal/binary/divisibility.js"
// import type { Nary } from "../../nonTerminal/nary/nary.js"
// import type { Unary } from "../../nonTerminal/unary/unary.js"
// import type { Root } from "../parser/root.js"
// import type { Str } from "../parser/str/str.js"

// export namespace References {}

// export type ReferencesOf<Ast, By extends string = string> = Filter<
//     References<Ast>,
//     By
// >

// // For extracting references, we only care about the node at index 0
// type UnaryTypedToken = Unary.Token | Bound.Token | Divisibility.Token

// type References<Ast> = Ast extends string
//     ? [Ast]
//     : Ast extends readonly unknown[]
//     ? Ast[1] extends UnaryTypedToken
//         ? References<Ast[0]>
//         : Ast[1] extends Nary.Token
//         ? [...References<Ast[0]>, ...References<Ast[2]>]
//         : StructuralReferences<Ast>
//     : StructuralReferences<Ast>

// type StructuralReferences<Ast> = StructReferences<
//     Ast extends readonly unknown[] ? Ast : UnionToTuple<Ast[keyof Ast]>,
//     []
// >

// type StructReferences<
//     Children extends readonly unknown[],
//     Result extends readonly unknown[]
// > = Children extends [infer Head, ...infer Tail]
//     ? StructReferences<Tail, [...Result, ...References<Head>]>
//     : Result

// export type ReferenceTypeOptions<Filter extends string = string> = {
//     filter?: Filter
// }

// type Filter<Arr extends string[], By extends string> = FilterRecurse<
//     Arr,
//     By,
//     []
// >

// type FilterRecurse<
//     References extends unknown[],
//     By extends string,
//     Result extends string[]
// > = References extends [infer Head, ...infer Tail]
//     ? FilterRecurse<
//           Tail,
//           By,
//           Head extends By
//               ? Head extends ElementOf<Result>
//                   ? Result
//                   : [...Result, Head]
//               : Result
//       >
//     : Result
