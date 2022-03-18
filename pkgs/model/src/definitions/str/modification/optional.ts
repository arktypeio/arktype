import { Modification } from "./modification.js"
import { Fragment } from "../fragment/fragment.js"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    invalidModifierError,
    UnknownTypeError
} from "./internal.js"
import { Str } from "../str.js"

export namespace Optional {
    export type Definition<Of extends string = string> = `${Of}?`

    export type Parse<Def extends Definition, Space> = Def extends Definition<
        infer Of
    >
        ? {
              optional: Str.Parse<Of, Space>
          }
        : UnknownTypeError<Def>

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
                return [Fragment.parse(def.slice(0, -1), ctx)]
            }
        },
        {
            matches: (def) => def.endsWith("?"),
            allows: ({ components }, valueType, opts) => {
                if (valueType === "undefined") {
                    return {}
                }
                return components[0].allows(valueType, opts)
            },
            generate: () => undefined
        }
    )

    export const delegate = parse as any as Definition
}
