import { typeDefProxy, validationError, createParser } from "../internal.js"
import { Literal } from "./literal.js"

export namespace StringLiteral {
    export type Definition<Text extends string = string> =
        | `'${Text}'`
        | `"${Text}"`

    export const type = typeDefProxy as Definition

    export const matcher = /^('.*?')|(".*?")/

    export const matches = (def: any): def is Definition => matcher.test(def)

    export const valueFrom = (def: Definition) => def.slice(1, -1)

    export const parse = createParser(
        {
            type,
            parent: () => Literal.parse
        },
        {
            matches,
            allows: ({ def, ctx: { path } }, valueType) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => valueFrom(def)
        }
    )

    export const delegate = parse as any as Definition
}
