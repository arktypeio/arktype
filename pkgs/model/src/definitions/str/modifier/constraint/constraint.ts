import { Modifier } from "../modifier.js"
import { Fragment } from "../../fragment.js"
import {
    duplicateModifierError,
    typeDefProxy,
    createParser,
    ExtractableDefinition
} from "../internal.js"
import { asNumber, isInteger, isNumeric } from "@re-/tools"

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

export namespace Constraint {
    export type Definition<
        Def extends string = string,
        Constraints extends string = string
    > = `${Def}:${Constraints}`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Modifier.parse,
            components: (def, ctx) => {
                const parts = def.split(":")
                if (parts.length > 2) {
                    throw new Error(duplicateModifierError(":"))
                }
                return {
                    typeDef: Fragment.parse(parts[0], ctx),
                    constraint: parts[1]
                }
            }
        },
        // define("string:#email")
        // define("")
        // define("number:5<=n<10,int")
        // ["5<n<10", "int"]
        // 4.3
        //
        {
            matches: (def) => def.includes(":"),
            allows: ({ def, components, ctx }, valueType, opts) => {
                const parts = components.constraint.split(",")
                const numericKeywords: Record<string, (n: number) => string> = {
                    int: (n) =>
                        isInteger(n) ? "" : `${n} must be an integer.`,
                    "+": (n) => (n > 0 ? "" : `${n} must be positive.`),
                    "-": (n) => (n < 0 ? "" : `${n} must be negative.`)
                }
                const stringKeywords: Record<string, (s: string) => string> = {}
                const assertNumber = (value: ExtractableDefinition) => {
                    if (typeof value !== "number") {
                        throw new Error(
                            `Constraint ${components.constraint} value must be a number.`
                        )
                    }
                    return value
                }
                parts.reduce((message, part) => {
                    if (part in numericKeywords) {
                        const value = assertNumber(valueType)
                        return message + numericKeywords[part](value)
                    }
                    if (part in stringKeywords) {
                    }
                    const comparators: Record<
                        string,
                        (left: number, right: number) => string
                    > = {
                        "<=": (left, right) =>
                            left > right
                                ? `${left} must be less than or equal to ${right}.`
                                : "",
                        ">=": (left, right) =>
                            left < right
                                ? `${left} must be greater than or equal to ${right}.`
                                : "",
                        "<": (left, right) =>
                            left >= right
                                ? `${left} must be less than ${right}.`
                                : "",
                        ">": (left, right) =>
                            left <= right
                                ? `${left} must be greater than ${right}.`
                                : ""
                    }
                    const comparisonMatcher = /(<=|>=|<|>)/
                    if (part.match(comparisonMatcher)) {
                        const comparisonParts = part.split(comparisonMatcher)
                        if (comparisonParts[0] in comparators) {
                            /**
                             *  A comparison starting with a comparator (e.g. "<3") is equivalent
                             *  to the statement with 'n' prepended (e.g. "n<3").
                             **/
                            comparisonParts.unshift("n")
                        }
                        let comparisonErrorMessage = ""
                        // All parts with odd indices should now be comparators if the constraint is valid
                        for (
                            let index = 1;
                            index < comparisonParts.length;
                            index += 2
                        ) {
                            const comparator = comparisonParts[index]
                            const toComparable = (comparedValue: string) => {
                                if (comparedValue === "n") {
                                    return valueType as number
                                }
                                const comparable = asNumber(comparedValue, {
                                    asFloat: true
                                })
                                if (comparable === null) {
                                    return `Unable to parse a numeric value from '${comparedValue}' in comparison '${part}'.`
                                }
                                return comparable
                            }
                            const left = toComparable(
                                comparisonParts[index - 1]
                            )
                            const right = toComparable(
                                comparisonParts[index + 1]
                            )
                            // If to comparable returns a string for the left or right side of the comparison, it is an invalid comparison
                            // TODO: Catch this when a model is defined, not when it is used for validation
                            if (typeof left === "string") {
                                return left
                            }
                            if (typeof right === "string") {
                                return right
                            }
                            comparisonErrorMessage += comparators[comparator](
                                left,
                                right
                            )
                        }
                    }
                    return message
                }, "")
                return {}
            },
            generate: ({ components }, opts) =>
                components.typeDef.generate(opts)
        }
    )

    export const delegate = parse as any as Definition
}
