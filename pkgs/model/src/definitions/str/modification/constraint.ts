import { Modification } from "./modification.js"
import { Str } from "../str.js"
import { typeDefProxy, createParser } from "../internal.js"

export namespace Constraints {
    export type Definition<
        Def extends string = string,
        Constraints extends string = string
    > = Modification.Definition<Def, ":", Constraints>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Modification.parse,
            components: (def, ctx) => [Str.parse(def.slice(0, -1), ctx)]
        },
        {
            matches: (def) => def.endsWith("?"),
            allows: ({ def, components, ctx }, valueType, opts) => {
                if (valueType === undefined) {
                    return {}
                }
                return components[0].allows(valueType, opts)
            },
            generate: () => undefined
        }
    )

    export const delegate = parse as any as Definition
}
