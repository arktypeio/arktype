import { Constraint } from "../constraint.js"
import { typeDefProxy, createParser } from "../internal.js"
import { asNumber } from "@re-/tools"

// Any
// Not (!)
// Or (|)
// And (,)
// Keywords (e.g. positive, email)

// Numbers:
// Less than/greater, equals (>, <, =)
// Integer
// Positive
// Negative

// Strings:
// Length
// Regex

// export namespace Comparison {
//     export type Definition<
//         Left extends string = string,
//         Right extends string = string
//     > = `${Left}${Comparator}${Right}`

//     export type Comparator = "<=" | ">=" | ">" | "<"

//     export const matcher = /(<=|>=|<|>)/

//     export const type = typeDefProxy as Definition

//     export const parse = createParser(
//         {
//             type,
//             parent: () => Constraint.parse,
//             components: (def, ctx) => {
//                 const parts = def.split(matcher)
//                 if (parts[0].match(matcher)) {
//                     /**
//                      *  A comparison starting with a comparator (e.g. "<3") is equivalent
//                      *  to the statement with 'n' prepended (e.g. "n<3").
//                      **/
//                     parts.unshift("n")
//                 }
//                 // All parts with odd indices should now be comparators if the constraint is valid
//                 return parts
//             }
//         },
//         {
//             matches: (def) => matcher.test(def),
//             allows: ({ def, components, ctx }, valueType, opts) => {
//                 const comparators: Record<
//                     string,
//                     (left: number, right: number) => string
//                 > = {
//                     "<=": (left, right) =>
//                         left > right
//                             ? `${left} must be less than or equal to ${right}.`
//                             : "",
//                     ">=": (left, right) =>
//                         left < right
//                             ? `${left} must be greater than or equal to ${right}.`
//                             : "",
//                     "<": (left, right) =>
//                         left >= right
//                             ? `${left} must be less than ${right}.`
//                             : "",
//                     ">": (left, right) =>
//                         left <= right
//                             ? `${left} must be greater than ${right}.`
//                             : ""
//                 }

//                 for (
//                     let index = 1;
//                     index < comparisonParts.length;
//                     index += 2
//                 ) {
//                     const comparator = comparisonParts[index]
//                     const toComparable = (comparedValue: string) => {
//                         if (comparedValue === "n") {
//                             return valueType as number
//                         }
//                         const comparable = asNumber(comparedValue, {
//                             asFloat: true
//                         })
//                         if (comparable === null) {
//                             return `Unable to parse a numeric value from '${comparedValue}' in comparison '${part}'.`
//                         }
//                         return comparable
//                     }
//                     const left = toComparable(comparisonParts[index - 1])
//                     const right = toComparable(comparisonParts[index + 1])
//                     // If to comparable returns a string for the left or right side of the comparison, it is an invalid comparison
//                     // TODO: Catch this when a model is defined, not when it is used for validation
//                     if (typeof left === "string") {
//                         return left
//                     }
//                     if (typeof right === "string") {
//                         return right
//                     }
//                     comparisonErrorMessage += comparators[comparator](
//                         left,
//                         right
//                     )
//                 }
//                 return message
//             }
//         }
//     )

//     export const delegate = parse as any as Definition
// }
