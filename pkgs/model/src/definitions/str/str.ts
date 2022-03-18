import { Root } from "../root.js"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    ReferencesTypeConfig,
    ValidationErrorMessage
} from "./internal.js"
import { Fragment } from "./fragment/fragment.js"
import { Modification } from "./modification/modification.js"

export namespace Str {
    export type Definition = string

    export type Parse<
        Def extends string,
        Space
    > = Def extends Modification.Definition
        ? Modification.Parse<Def, Space>
        : Fragment.Parse<Def, Space>

    // export type Parse<
    //     Def extends string,
    //     Space,
    //     Options extends ParseConfig
    // > = Str.Check<Def, Space> extends ValidationErrorMessage
    //     ? unknown
    //     : Def extends Modification.Definition
    //     ? Modification.Parse<Def, Space, Options>
    //     : Fragment.Parse<Def, Space, Options>

    export type References<
        Def extends string,
        Space,
        Config extends ReferencesTypeConfig
    > = []

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [Modification.delegate, Fragment.delegate]
        },
        {
            matches: (def) => typeof def === "string",
            // TODO: Fix
            references: ({ def }) => [def]
        }
    )

    export const delegate = parse as any as Definition
}
