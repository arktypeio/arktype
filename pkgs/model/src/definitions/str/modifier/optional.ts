import { Modifier } from "./modifier.js"
import { Fragment } from "../fragment.js"
import {
    typeDefProxy,
    createParser,
    duplicateModifierError,
    invalidModifierError
} from "./internal.js"

export namespace Optional {
    export type Definition<Def extends string = string> = `${Def}?`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Modifier.parse,
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
            matches: (def) => def.includes("?"),
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
