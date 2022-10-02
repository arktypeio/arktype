import type {
    ElementOf,
    Get,
    IsAny,
    IterateType,
    Join,
    Narrow
} from "@re-/tools"
import type { Root } from "../api.js"
import type { ParserContext } from "../parser/common.js"
import type { Str } from "../parser/str/str.js"

export type ParseSpace<Aliases> = {
    [Name in keyof Aliases]: Root.Parse<Aliases[Name], { aliases: Aliases }>
}

export type ValidateStringResolution<
    Name extends keyof Ctx["aliases"],
    Ctx extends ParserContext
> = IfShallowCycleErrorElse<
    CheckResolutionForShallowCycle<
        Ctx["aliases"][Name],
        Ctx["aliases"],
        [Extract<Name, string>]
    >,
    Str.Validate<Extract<Ctx["aliases"][Name], string>, Ctx>
>

export const shallowCycleMessage = <Seen extends string[]>(
    shallowSeen: Narrow<Seen>
): ShallowCycleMessage<Seen> =>
    `${shallowSeen[0]} references a shallow cycle: ${
        shallowSeen.join("=>") as any
    }`

type ShallowCycleMessage<Seen extends string[]> =
    `${Seen[0]} references a shallow cycle: ${Join<Seen, "=>">}`

export type CheckResolutionForShallowCycle<
    Resolution,
    Dict,
    Seen extends string[]
> = IsAny<Resolution> extends true
    ? []
    : CheckResolutionForShallowCycleRecurse<Resolution, Dict, Seen>

/** For a given resolution, check it's shallow references to other aliases for cycles */
type CheckResolutionForShallowCycleRecurse<
    Resolution,
    Dict,
    Seen extends string[]
> = Resolution extends string
    ? IterateReferencesForShallowCycle<
          [],
          //RootNode.References<Resolution, false>,
          Dict,
          Seen
      >
    : []

/**  For a list of string references, if any is in Seen, return Seen plus that reference,
 *   to represent the path at which the cycle occured. Otherwise, append the reference to seen and recurse.  */
type IterateReferencesForShallowCycle<
    References,
    Dict,
    Seen extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? Current extends keyof Dict
        ? Current extends ElementOf<Seen>
            ? [...Seen, Current]
            : IfShallowCycleTupleElse<
                  CheckResolutionForShallowCycleRecurse<
                      Get<Dict, Current>,
                      Dict,
                      [...Seen, Current]
                  >,
                  IterateReferencesForShallowCycle<Remaining, Dict, Seen>
              >
        : IterateReferencesForShallowCycle<Remaining, Dict, Seen>
    : []

/** When we detect a ShallowCycle, the generic will return a string tuple representing the cycle path.
 *  Otherwise, we return an empty tuple if no tuple is detected.
 *  This generic simply returns cycle path if it is not an empty tuple, otherwise it will return Else.
 */
type IfShallowCycleTupleElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : CheckResult

export type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleMessage<CheckResult>

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

// references(opts: References.ReferencesOptions): string[] {
//     const collected = {}
//     this.collectReferences(opts, collected)
//     return Object.keys(collected)
// }

// /** Mutates collected by adding references as keys */
// abstract collectReferences(
//     opts: References.ReferencesOptions,
//     collected: KeySet
// ): void

// collectReferences(
//     opts: References.ReferencesOptions,
//     collected: KeySet
// ) {
//     for (const child of this.children) {
//         child.collectReferences(opts, collected)
//     }
// }

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
