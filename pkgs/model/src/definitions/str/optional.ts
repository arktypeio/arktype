import { KeyValuate, WithPropValue } from "@re-/tools"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    DuplicateModifierError,
    Defer,
    DeepNode
} from "./internal.js"
import { Str } from "./str.js"
import { Fragment } from "./fragment.js"

export namespace Optional {
    export type Definition<Of extends string = string> = `${Of}?`

    export type Kind = "optional"

    export interface Node extends DeepNode<Kind> {}

    export type Parse<Def, Resolutions, Context> = Def extends Definition<
        infer Of
    >
        ? "?" extends KeyValuate<Context, "modifiers">
            ? DuplicateModifierError<"?">
            : DeepNode<
                  Kind,
                  Str.Parse<
                      Of,
                      Resolutions,
                      WithPropValue<
                          Context,
                          "modifiers",
                          "?" | KeyValuate<Context, "modifiers">
                      >
                  >
              >
        : Defer

    export type TypeOf<N extends Node, Resolutions, Options> =
        | Str.TypeOf<N["children"], Resolutions, Options>
        | undefined

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Fragment.parser,
            components: (def, ctx) => {
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
