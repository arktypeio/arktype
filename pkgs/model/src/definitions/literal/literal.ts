import { KeyValuate, narrow } from "@re-/tools"
import {
    typeDefProxy,
    createParser,
    validationError,
    Precedence,
    Defer
} from "./internal.js"
import { Root } from "../root.js"
import { typeOf } from "../../utils.js"

export namespace Literal {
    export type Definition = RegExp | PrimitiveLiteral

    export type PrimitiveLiteral = number | bigint | boolean | undefined | null

    export type Node = PrimitiveLiteral | { regex: string }

    export type Parse<Def> = Precedence<
        [
            Def extends RegExp ? { regex: string } : Defer,
            Def extends PrimitiveLiteral ? Def : Defer
        ]
    >

    export type TypeOf<N extends Node> = N extends { regex: string }
        ? string
        : N

    export type ReferencesOf<
        Def extends Definition,
        Config,
        Result extends string = `${Def extends RegExp
            ? "RegExp"
            : Def}${Def extends bigint ? "n" : ""}` &
            KeyValuate<Config, "filter">
    > = KeyValuate<Config, "asTuple"> extends true
        ? [Result]
        : KeyValuate<Config, "asList"> extends true
        ? Result[]
        : Result

    export const type = typeDefProxy as Definition

    export const typesOf = narrow(["number", "bigint", "boolean", "undefined"])

    export const parser = createParser(
        {
            type,
            parent: () => Root.parser
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

    export const delegate = parser as unknown as Definition
}
