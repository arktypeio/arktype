import { narrow } from "@re-/tools"
import { typeDefProxy, createParser, validationError } from "./internal.js"
import { Root } from "../root.js"
import { ReferencesTypeConfig } from "../internal.js"
import { typeOf } from "../../utils.js"

export namespace Primitive {
    export type Definition = number | bigint | boolean | undefined | null

    export type Node = Definition

    export type References<
        Def extends Definition,
        Config extends ReferencesTypeConfig,
        Result extends string = `${Def}${Def extends bigint ? "n" : ""}` &
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
                definition === null,
            validate: ({ def, ctx: { path } }, value, opts) => {
                const valueType = typeOf(value)
                if (typeof def === "number" || typeof def === "bigint") {
                    return def === valueType
                        ? {}
                        : validationError({ def, valueType, path })
                }
                return `${def}` === valueType
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => def,
            references: ({ def }) => [
                `${def}${typeof def === "bigint" ? "n" : ""}`
            ]
        }
    )

    export const delegate = parse as unknown as Definition
}
