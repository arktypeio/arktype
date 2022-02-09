import { Modifier } from "../modifier.js"
import { Fragment } from "../../fragment.js"
import {
    duplicateModifierError,
    typeDefProxy,
    createParser,
    ExtractableDefinition
} from "../internal.js"
import { asNumber, isInteger } from "@re-/tools"

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

// define("string:#email")
// define("")
// define("number:5<=n<10,int")
// ["5<n<10", "int"]
// 4.3
//

// TODO: Make this a root constraint (includes ":") (should delegate allows)
// Child components are:
// Constraint list (includes ",")
// String constraints (probably an aggregate matcher)
// Numeric constraints (probably an aggregate matcher)

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
                    constraints: parts[1].split(",")
                }
            }
        },
        {
            matches: (def) => def.includes(":"),
            allows: ({ def, components, ctx }, valueType, opts) => {
                components.constraints.reduce((message, part) => {
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
