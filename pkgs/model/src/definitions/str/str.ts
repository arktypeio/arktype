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
import { LeafOf, ListPossibleTypes } from "@re-/tools"

export namespace Str {
    export type Definition = string

    export type Parse<
        Def extends string,
        Space
    > = Def extends Modification.Definition
        ? Modification.Parse<Def, Space>
        : Fragment.Parse<Def, Space>

    export type Node = Modification.Node | Fragment.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig
    > = N extends Modification.Node
        ? Modification.TypeOf<N, Space, Options>
        : N extends Fragment.Node
        ? Fragment.TypeOf<N, Space, Options>
        : unknown

    export type ReferencesOf<
        Def extends Definition,
        Space,
        Config extends ReferencesTypeConfig,
        Reference extends string = LeafOf<Parse<Def, Space>, Config["filter"]>
    > = Config["asTuple"] extends true
        ? ListPossibleTypes<Reference>
        : Reference

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
