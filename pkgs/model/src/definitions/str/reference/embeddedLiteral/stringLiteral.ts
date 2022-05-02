import { create } from "../../../../model.js"
import { typeOf } from "../../../../utils.js"
import { typeDefProxy, validationError, createParser } from "../internal.js"
import { FirstEnclosed } from "./internal.js"
import { EmbeddedLiteral } from "./embeddedLiteral.js"

export namespace StringLiteral {
    export type SingleQuoted<Text extends string = string> = `'${Text}'`

    export type DoubleQuoted<Text extends string = string> = `"${Text}"`

    export type Definition<Text extends string = string> =
        | SingleQuoted<Text>
        | DoubleQuoted<Text>

    export type Matches<Def extends string> = Def extends SingleQuoted<
        FirstEnclosed<Def, `'`>
    >
        ? true
        : Def extends DoubleQuoted<FirstEnclosed<Def, `"`>>
        ? true
        : false

    export const type = typeDefProxy as string

    // Matches a definition enclosed by single quotes that does not contain any other single quotes
    // Or a definition enclosed by double quotes that does not contain any other double quotes
    export const matcher = /^('[^']*'|^"[^"]*?")$/

    export const matches = (def: any): def is string => matcher.test(def)

    export const valueFrom = (def: string) => def.slice(1, -1)

    export const parser = createParser(
        {
            type,
            parent: () => EmbeddedLiteral.parser
        },
        {
            matches,
            validate: ({ def, ctx: { path } }, value) => {
                const valueType = typeOf(value)
                return def === valueType
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => valueFrom(def)
        }
    )

    export const delegate = parser as any as string
}
