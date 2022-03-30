import { Root } from "../root.js"
import {
    TypeOfContext,
    createParser,
    typeDefProxy,
    ReferencesTypeConfig,
    ValidationErrorMessage,
    ParseTypeContext,
    DefaultParseTypeContext
} from "./internal.js"
import { Fragment } from "./fragment/fragment.js"
import { Modification } from "./modification/modification.js"
import { LeafOf, ListPossibleTypes } from "@re-/tools"

export namespace Str {
    export type Definition = string

    export type Parse<
        Def extends string,
        Space,
        Context extends ParseTypeContext
    > = Def extends Modification.Definition
        ? Modification.Parse<Def, Space, Context>
        : Fragment.Parse<Def, Space, Context>

    export type Node = Modification.Node | Fragment.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext<Space>
    > = N extends Modification.Node
        ? Modification.TypeOf<N, Space, Options>
        : N extends Fragment.Node
        ? Fragment.TypeOf<N, Space, Options>
        : unknown

    export type Validate<
        Def extends Definition,
        Space,
        Errors extends string[] = ReferencesOf<
            Def,
            Space,
            { asTuple: true; asList: false; filter: ValidationErrorMessage }
        >
    > = Errors extends [] ? Def : { errors: Errors }

    export type ReferencesOf<
        Def extends Definition,
        Space,
        Config extends ReferencesTypeConfig,
        Reference extends string = LeafOf<
            Parse<Def, Space, DefaultParseTypeContext>,
            Config["filter"]
        >
    > = Config["asTuple"] extends true
        ? ListPossibleTypes<Reference>
        : Config["asList"] extends true
        ? Reference[]
        : Reference

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [Modification.delegate, Fragment.delegate]
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parse as any as Definition
}
