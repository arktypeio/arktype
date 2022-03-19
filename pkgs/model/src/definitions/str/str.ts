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
import { ElementOf, ListPossibleTypes, ValueOf } from "@re-/tools"

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

    // type LeafOf<Obj, LeafType = NonRecursible> = Obj extends LeafType
    //     ? Obj
    //     : Obj extends NonRecursible
    //     ? never
    //     : { [K in keyof Obj]: LeafOf<Obj[K], LeafType> }[keyof Obj]

    export type Validate<
        Def extends Definition,
        Space,
        Errors extends string[] = ListPossibleTypes<
            ValidateNode<Parse<Def, Space>>
        >
    > = Errors extends [] ? Def : Errors[0]

    type ValidateNode<N> = N extends string
        ? N extends ValidationErrorMessage
            ? N
            : never
        : ValueOf<{ [K in keyof N]: ValidateNode<N[K]> }>

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
