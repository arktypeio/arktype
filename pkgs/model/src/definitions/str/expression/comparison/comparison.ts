import { NumberKeyword, StringKeyword, NumberLiteral } from "../../builtin"
import {
    typeDefProxy,
    CheckSplittable,
    ParseConfig,
    ParseSplittable
} from "../internal.js"
import { Bounded } from "./bounded.js"
import { Limited } from "./limited.js"

export type Comparable = NumberKeyword | StringKeyword

export type Bound = NumberLiteral.Definition

export type Comparator = "<=" | ">=" | ">" | "<"

// number<5 number>7
// 3<number<5

export namespace Comparison {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}${Comparator}${Right}`

    export type Check<
        Def extends Definition,
        Root extends string,
        Space
    > = Def extends `${string}${Comparator}${string}${Comparator}${string}${Comparator}${string}`
        ? `Comparisons cannot reference more than three values (e.g. 0<number<=100).`
        : Def extends Bounded.Definition
        ? Bounded.Check<Def, Root, Space>
        : Limited.Check<Def, Root, Space>

    export type Parse<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = ParseSplittable<"|", Def, Space, Options>

    export const matcher = /(<=|>=|<|>)/

    export const type = typeDefProxy as Definition

    // export const parse = createParser(
    //     {
    //         type,
    //         parent: () => Expression.parse,
    //         components: (def, ctx) => {
    //             const parts = def.split(matcher)
    //             if (parts.length === 5) {
    //             }
    //         }
    //     },
    //     {
    //         matches: (def) => matcher.test(def),
    //         allows: ({ def, components, ctx }, valueType, opts) => {
    //             const comparators: Record<
    //                 string,
    //                 (left: number, right: number) => string
    //             > = {
    //                 "<=": (left, right) =>
    //                     left > right
    //                         ? `${left} must be less than or equal to ${right}.`
    //                         : "",
    //                 ">=": (left, right) =>
    //                     left < right
    //                         ? `${left} must be greater than or equal to ${right}.`
    //                         : "",
    //                 "<": (left, right) =>
    //                     left >= right
    //                         ? `${left} must be less than ${right}.`
    //                         : "",
    //                 ">": (left, right) =>
    //                     left <= right
    //                         ? `${left} must be greater than ${right}.`
    //                         : ""
    //             }

    //             for (let index = 1; index < components.length; index += 2) {
    //                 const comparator = components[index]
    //                 const toComparable = (comparedValue: string) => {
    //                     if (comparedValue === "n") {
    //                         return valueType as number
    //                     }
    //                     const comparable = asNumber(comparedValue, {
    //                         asFloat: true
    //                     })
    //                     if (comparable === null) {
    //                         return `Unable to parse a numeric value from '${comparedValue}' in comparison '${part}'.`
    //                     }
    //                     return comparable
    //                 }
    //                 const left = toComparable(components[index - 1])
    //                 const right = toComparable(components[index + 1])
    //                 // If to comparable returns a string for the left or right side of the comparison, it is an invalid comparison
    //                 // TODO: Catch this when a model is defined, not when it is used for validation
    //                 if (typeof left === "string") {
    //                     return left
    //                 }
    //                 if (typeof right === "string") {
    //                     return right
    //                 }
    //                 comparisonErrorMessage += comparators[comparator](
    //                     left,
    //                     right
    //                 )
    //             }
    //             return message
    //         },
    //         generate: () => {}
    //     }
    // )

    // export const delegate = parse as any as Definition
}
