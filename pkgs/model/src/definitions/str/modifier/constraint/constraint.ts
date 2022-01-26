import { Modifier } from "../modifier.js"
import { Fragment } from "../../fragment.js"
import {
    duplicateModifierError,
    typeDefProxy,
    createParser,
    ExtractableDefinition
} from "../internal.js"
import { isInteger } from "@re-/tools"

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
                        (value: number, previousValue: number) => string
                    > = {
                        "<=": (value, previousValue) =>
                            value < previousValue
                                ? `${previousValue} must be less than or equal to ${value}.`
                                : "",
                        ">=": (value, previousValue) =>
                            value > previousValue
                                ? `${previousValue} must be greater than or equal to ${value}.`
                                : "",
                        "<": (value, previousValue) =>
                            value <= previousValue
                                ? `${previousValue} must be less than ${value}.`
                                : "",
                        ">": (value, previousValue) =>
                            value >= previousValue
                                ? `${previousValue} must be greater than ${value}.`
                                : ""
                    }
                    if (part.includes("<=")) {
                        const comparisonValues = part.split("<=")
                        let previousValue = comparisonValues[0]
                        for (const value of comparisonValues.slice(1)) {
                            if (value < previousValue) {
                                return message
                            }
                            previousValue = value
                        }
                        return message
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
