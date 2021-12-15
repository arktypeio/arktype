import { typeDefProxy, valueGenerationError, createParser } from "./internal.js"
import { Fragment } from "../fragment.js"
import { ExtractableName } from "./extractableName.js"
import { UnextractableName } from "./unextractableName.js"

export namespace BuiltIn {
    export type Definition<Def extends keyof Defaults = keyof Defaults> = Def

    export type Parse<Def extends Definition> = Defaults[Def]

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (definition) => definition in defaults,
            children: () => [
                ExtractableName.delegate,
                UnextractableName.delegate
            ]
        },
        {
            generate: ({ def, ctx }) => {
                if (def === "never") {
                    throw new Error(valueGenerationError({ def, ctx }))
                }
                return defaults[def]
            },
            references: ({ def }, { includeBuiltIn }) =>
                includeBuiltIn ? [def] : []
        }
    )

    export const delegate = parse as any as Definition

    export const defaults = {
        ...ExtractableName.defaults,
        ...UnextractableName.defaults
    }

    export type Defaults = typeof defaults
}
