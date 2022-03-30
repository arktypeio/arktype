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
        Resolutions,
        Context extends ParseTypeContext
    > = Def extends Modification.Definition
        ? Modification.Parse<Def, Resolutions, Context>
        : Fragment.Parse<Def, Resolutions, Context>

    export type Node = Modification.Node | Fragment.Node

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = N extends Modification.Node
        ? Modification.TypeOf<N, Resolutions, Options>
        : N extends Fragment.Node
        ? Fragment.TypeOf<N, Resolutions, Options>
        : unknown

    export type Validate<
        Def extends Definition,
        Resolutions,
        Errors extends string[] = ReferencesOf<
            Def,
            Resolutions,
            { asTuple: true; asList: false; filter: ValidationErrorMessage }
        >
    > = Errors extends [] ? Def : { errors: Errors }

    export type ReferencesOf<
        Def extends Definition,
        Resolutions,
        Config extends ReferencesTypeConfig,
        Reference extends string = LeafOf<
            Parse<Def, Resolutions, DefaultParseTypeContext>,
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
