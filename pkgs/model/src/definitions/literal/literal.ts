import { narrow } from "@re-/tools"
import { typeDefProxy, createParser, validationError } from "./internal.js"
import { Root } from "../root.js"
import { ReferencesTypeConfig } from "../internal.js"
import { typeOf } from "../../utils.js"

export namespace Literal {
    export type Definition =
        | number
        | bigint
        | boolean
        | undefined
        | null
        | RegExp

    export type Node = Exclude<Definition, RegExp> | { regex: string }

    export type Parse<Def extends Definition> = Def extends RegExp
        ? { regex: string }
        : Def

    export type TypeOf<N extends Node> = N extends { regex: string }
        ? string
        : N

    export type References<
        Def extends Definition,
        Config extends ReferencesTypeConfig,
        Result extends string = `${Def extends RegExp
            ? "RegExp"
            : Def}${Def extends bigint ? "n" : ""}` &
            Config["filter"]
    > = Config["asTuple"] extends true
        ? [Result]
        : Config["asList"] extends true
        ? Result[]
        : Result

    export const type = typeDefProxy as Definition

    export const typesOf = narrow(["number", "bigint", "boolean", "undefined"])

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse
        },
        {
            matches: (definition) =>
                typesOf.includes(typeof definition as any) ||
                definition === null ||
                definition instanceof RegExp,
            validate: ({ def, ctx: { path } }, value, opts) => {
                const valueType = typeOf(value)
                if (def instanceof RegExp) {
                    return def.test(value as any)
                        ? {}
                        : validationError({
                              def: `/${def.source}/`,
                              valueType,
                              path
                          })
                }
                if (typeof def === "number" || typeof def === "bigint") {
                    return def === value
                        ? {}
                        : validationError({ def, valueType, path })
                }
                return `${def}` === valueType
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => {
                if (def instanceof RegExp) {
                    throw new Error(
                        `Generation of regular expressions is not supported.`
                    )
                }
                return def
            },
            references: ({ def }) => [
                `${def instanceof RegExp ? "RegExp" : def}${
                    typeof def === "bigint" ? "n" : ""
                }`
            ]
        }
    )

    export const delegate = parse as unknown as Definition
}
