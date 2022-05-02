import { KeyValuate, WithPropValue } from "@re-/tools"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    UnknownTypeError,
    DuplicateModifierError
} from "./internal.js"
import { Str } from "./str.js"
import { Fragment } from "./fragment.js"

export namespace Optional {
    export type Definition<Of extends string = string> = `${Of}?`

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context
    > = Def extends Definition<infer Of>
        ? "?" extends KeyValuate<Context, "modifiers">
            ? DuplicateModifierError<"?">
            : {
                  optional: Str.Parse<
                      Of,
                      Resolutions,
                      WithPropValue<
                          Context,
                          "modifiers",
                          "?" | KeyValuate<Context, "modifiers">
                      >
                  >
              }
        : UnknownTypeError<Def>

    export type Node = {
        optional: any
    }

    export type TypeOf<N, Resolutions, Options> = N extends Node
        ? Str.TypeOf<N["optional"], Resolutions, Options> | undefined
        : unknown

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
