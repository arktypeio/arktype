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
        // define("number:5<n<10,int")
        // ["5<n<10", "int"]
        // 4.3
        //
        {
            matches: (def) => def.includes(":"),
            allows: ({ def, components, ctx }, valueType, opts) => {
                const parts = components.constraint.split(",")
                const numericKeywords: Record<string, (n: number) => string> = {
                    int: (n) => (isInteger(n) ? "" : `${n} must be an integer.`)
                }
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
