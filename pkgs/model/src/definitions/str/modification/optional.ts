import { WithPropValue } from "@re-/tools"
import { Modification } from "./modification.js"
import { Fragment } from "../fragment/fragment.js"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    invalidModifierError,
    UnknownTypeError,
    TypeOfContext
} from "./internal.js"
import { Str } from "../str.js"
import { DuplicateModifierError, ParseTypeContext } from "../internal.js"

export namespace Optional {
    export type Definition<Of extends string = string> = `${Of}?`

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext
    > = Def extends Definition<infer Of>
        ? "?" extends Context["modifiers"]
            ? DuplicateModifierError<"?">
            : {
                  optional: Str.Parse<
                      Of,
                      Space,
                      WithPropValue<
                          Context,
                          "modifiers",
                          "?" | Context["modifiers"]
                      >
                  >
              }
        : UnknownTypeError<Def>

    export type Node = {
        optional: Str.Node
    }

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext
    > = N extends Node
        ? Str.TypeOf<N["optional"], Space, Options> | undefined
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Modification.parse,
            components: (def, ctx) => {
                if (ctx.modifiers.includes("?")) {
                    throw new Error(duplicateModifierError("?"))
                }
                return {
                    optional: Str.parse(def.slice(0, -1), {
                        ...ctx,
                        modifiers: [...ctx.modifiers, "?"]
                    })
                }
            }
        },
        {
            matches: (def) => def.endsWith("?"),
            allows: ({ components }, valueType, opts) => {
                if (valueType === "undefined") {
                    return {}
                }
                return components.optional.allows(valueType, opts)
            },
            generate: () => undefined,
            references: ({ components }) => components.optional.references()
        }
    )

    export const delegate = parse as any as Definition
}
