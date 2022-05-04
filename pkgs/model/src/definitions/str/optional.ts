import { Evaluate, Get, KeyValuate, WithPropValue } from "@re-/tools"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    DuplicateModifierError,
    Defer,
    DeepNode,
    invalidModifierError,
    Root,
    ErrorNode,
    ParseError
} from "./internal.js"
import { Str } from "./str.js"

export namespace Optional {
    export type Definition<Child extends string = string> = `${Child}?`

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Str.parser,
            components: (def, ctx) => {
                if (ctx.stringRoot !== def) {
                    throw new Error(invalidModifierError("?"))
                }
                if (ctx.modifiers.includes("?")) {
                    throw new Error(duplicateModifierError("?"))
                }
                return {
                    optional: Str.parser.parse(def.slice(0, -1), {
                        ...ctx,
                        modifiers: [...ctx.modifiers, "?"]
                    })
                }
            }
        },
        {
            matches: (def) => def.endsWith("?"),
            validate: ({ components }, value, opts) => {
                if (value === undefined) {
                    return {}
                }
                return components.optional.validate(value, opts)
            },
            generate: () => undefined,
            references: ({ components }) => components.optional.references()
        }
    )

    export const delegate = parser as any as Definition
}
