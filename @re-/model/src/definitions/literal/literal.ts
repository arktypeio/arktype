import { narrow } from "@re-/tools"
import { typeOf } from "../../utils.js"
import { Root } from "../root.js"
import { createParser, typeDefProxy, validationError } from "./internal.js"

export namespace Literal {
    export type Definition = RegExp | PrimitiveLiteral

    export type PrimitiveLiteral = number | bigint | boolean | undefined | null

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
            validate: ({ def, ctx: { path } }, value) => {
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
                    throw new TypeError(
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
