import { typeDefProxy, createParser } from "./internal.js"
import { Str } from "./str.js"

const invalidModifierError = `Modifier '?' is only valid at the end of a type definition.`

type InvalidModifierError = typeof invalidModifierError

export namespace Optional {
    export type Definition<Child extends string = string> = `${Child}?`

    export const type = typeDefProxy as Definition

    export type FastValidate<
        Child extends string,
        Dict,
        Root
    > = `${Child}?` extends Root
        ? Str.FastValidate<Child, Dict, Root>
        : InvalidModifierError

    export const parser = createParser(
        {
            type,
            parent: () => Str.parser,
            components: (def, ctx) => {
                if (ctx.stringRoot !== def) {
                    throw new Error(invalidModifierError)
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
