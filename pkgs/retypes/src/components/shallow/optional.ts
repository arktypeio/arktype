import { typeDefProxy } from "../../common.js"
import { createParser } from "../parser.js"
import { Fragment } from "./fragment.js"
import { Str } from "./str.js"

export namespace Optional {
    export type Definition<
        Def extends Fragment.Definition = Fragment.Definition
    > = `${Def}?`

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Str.parse,
        matches: (definition) => definition.endsWith("?"),
        parse: (definition, context) => ({
            allows: (assignment, opts) => {
                if (assignment === "undefined") {
                    return {}
                }
                return Fragment.parse(definition.slice(0, -1), context).allows(
                    assignment,
                    opts
                )
            },
            getDefault: () => undefined,
            references: (opts) =>
                Fragment.parse(definition.slice(0, -1), context).references(
                    opts
                )
        })
    })

    export const delegate = parse as any as Definition
}
