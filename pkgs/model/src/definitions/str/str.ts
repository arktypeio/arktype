import { Root } from "../root.js"
import {
    createParser,
    typeDefProxy,
    ValidationErrorMessage,
    DefaultParseTypeContext
} from "./internal.js"
import { Fragment } from "./fragment.js"
import { KeyValuate, LeafOf, ListPossibleTypes } from "@re-/tools"
import { Optional } from "./optional.js"

export namespace Str {
    export type Definition = string

    export type Parse<
        Def extends string,
        Resolutions,
        Context
    > = Def extends Optional.Definition
        ? Optional.Parse<Def, Resolutions, Context>
        : Fragment.Parse<Def, Resolutions, Context>

    export type TypeOf<N, Resolutions, Options> = N extends Optional.Node
        ? Optional.TypeOf<N, Resolutions, Options>
        : Fragment.TypeOf<N, Resolutions, Options>

    export type Validate<
        Def extends Definition,
        Resolutions,
        Errors = ReferencesOf<
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

    export const parser = createParser(
        {
            type,
            parent: () => Root.parser,
            children: () => [Optional.delegate, Fragment.delegate]
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parser as any as Definition
}
