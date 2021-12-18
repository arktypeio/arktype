import { ListPossibleTypes, narrow } from "@re-/tools"
import { typeDefProxy, createParser, validationError } from "./internal.js"
import { Root } from "../root.js"
import { ReferencesTypeConfig } from "../internal.js"

export namespace Primitive {
    export type Definition = number | bigint | boolean | undefined | null

    export type References<
        Def extends Definition,
        Config extends ReferencesTypeConfig,
        Result extends string = `${Def}${Def extends bigint ? "n" : ""}` &
            Config["filter"]
    > = Config["asList"] extends true
        ? ListPossibleTypes<Result>
        : Config["asUnorderedList"] extends true
        ? [Result]
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
            allows: ({ def, ctx: { path } }, valueType, opts) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => def,
            references: ({ def }) => [
                `${def}${typeof def === "bigint" ? "n" : ""}`
            ]
        }
    )

    export const delegate = parse as unknown as Definition
}
