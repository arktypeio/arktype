import { Modifier } from "./modifier.js"
import { Fragment } from "../fragment.js"
import { typeDefProxy, createParser } from "../internal.js"
import { duplicateModifierError, invalidModifierError } from "./internal.js"

export namespace Constraints {
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
                    typeDef: Modifier.parse(parts[0], ctx),
                    constraints: parts[1]
                }
            }
        },
        {
            matches: (def) => def.includes(":"),
            allows: ({ def, components, ctx }, valueType, opts) => {
                if (valueType === undefined) {
                    return {}
                }
                return components[0].allows(valueType, opts)
            },
            generate: () => undefined
        }
    )

    export const delegate = parse as any as Definition
}
