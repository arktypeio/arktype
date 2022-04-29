import { Root } from "../root.js"
import {
    createParser,
    typeDefProxy,
    ValidationErrorMessage,
    DefaultParseTypeContext
} from "./internal.js"
import { Fragment } from "./fragment/fragment.js"
import { Modification } from "./modification/modification.js"
import { KeyValuate, LeafOf, ListPossibleTypes } from "@re-/tools"

export namespace Str {
    export type Definition = string

    export type Parse<
        Def extends string,
        Resolutions,
        Context
    > = Def extends Modification.Definition
        ? Modification.Parse<Def, Resolutions, Context>
        : Fragment.Parse<Def, Resolutions, Context>

    export type Node = Modification.Node | Fragment.Node

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options
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
        Config,
        Reference extends string = LeafOf<
            Parse<Def, Resolutions, DefaultParseTypeContext>,
            KeyValuate<Config, "filter">
        >
    > = KeyValuate<Config, "asTuple"> extends true
        ? ListPossibleTypes<Reference>
        : KeyValuate<Config, "asList"> extends true
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
