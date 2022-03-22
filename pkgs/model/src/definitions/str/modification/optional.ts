import { WithPropValue } from "@re-/tools"
import { Modification } from "./modification.js"
import { Fragment } from "../fragment/fragment.js"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    invalidModifierError,
    UnknownTypeError,
    ParseConfig
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
        Options extends ParseConfig
    > = N extends Node
        ? Str.TypeOf<N["optional"], Space, Options> | undefined
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Modification.parse,
            components: (def, ctx) => {
                const tokenCount = def.match(/\?/g)?.length
                if (tokenCount !== 1) {
                    throw new Error(duplicateModifierError("?"))
                }
                if (!def.endsWith("?")) {
                    throw new Error(invalidModifierError("?"))
                }
                return { optional: Fragment.parse(def.slice(0, -1), ctx) }
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
