import { typeDefProxy, createParser } from "./internal.js"
import { Str } from "./str.js"

export namespace Optional {
    export type Definition<Child extends string = string> = `${Child}?`

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Str.parser,
            components: (def, ctx) => {
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
