import { RemoveSpaces } from "@re-do/utils"
import { ParseTypeRecurseOptions, UnknownTypeError } from "./common.js"
import { fragment, Fragment, optional, Optional, Shallow } from "."
import { ComponentInput } from "../component.js"

export namespace Str {
    export type Definition<Def extends string = string> = Def

    export type Validate<
        Def extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean,
        ParsableDefinition extends string = RemoveSpaces<Def>
    > = Fragment.Validate<
        ParsableDefinition extends Optional.Definition<infer OptionalDef>
            ? OptionalDef
            : ParsableDefinition,
        Def,
        DeclaredTypeName,
        ExtractTypesReferenced
    >

    export type Parse<
        Def extends string,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        ParsableDefinition extends string = RemoveSpaces<Def>
    > =
        // If Definition is an error, e.g. from an invalid TypeSet, return it immediately
        Def extends UnknownTypeError
            ? Def
            : ParsableDefinition extends Optional.Definition<infer OptionalDef>
            ? Fragment.Parse<OptionalDef, TypeSet, Options> | undefined
            : Fragment.Parse<ParsableDefinition, TypeSet, Options>
}

export const str: ComponentInput<Shallow.Definition, Str.Definition> = {
    matches: ({ definition }) => typeof definition === "string",
    children: [optional, fragment]
}
