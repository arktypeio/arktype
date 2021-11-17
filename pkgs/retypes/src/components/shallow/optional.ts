import { typeDefProxy } from "../../common.js"
import { createParser } from "../parser.js"
import { Fragment } from "./fragment.js"
import { Str } from "./str.js"

export namespace Optional {
    export type Definition<
        Def extends Fragment.Definition = Fragment.Definition
    > = `${Def}?`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
            matches: (def) => def.endsWith("?"),
            components: (def, ctx) => [Fragment.parse(def.slice(0, -1), ctx)]
        },
        {
            allows: ({ def, components, ctx }, valueType, opts) => {
                if (valueType === "undefined") {
                    return {}
                }
                return components[0].allows(valueType, opts)
            },
            generate: () => undefined,
            references: ({ components }, opts) => components[0].references(opts)
        }
    )

    export const delegate = parse as any as Definition
}
