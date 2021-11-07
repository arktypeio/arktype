import { RemoveSpaces } from "@re-do/utils"
import {
    ParseTypeRecurseOptions,
    UnknownTypeError,
    OptionalDefinition
} from "./common.js"
import { Fragment } from "."

export type Definition<Def extends string = string> = Def

export type Validate<
    Def extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    ParsableDefinition extends string = RemoveSpaces<Def>
> = Fragment.Validate<
    ParsableDefinition extends OptionalDefinition<infer Optional>
        ? Optional
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
        : ParsableDefinition extends OptionalDefinition<infer OptionalType>
        ? Fragment.Parse<OptionalType, TypeSet, Options> | undefined
        : Fragment.Parse<ParsableDefinition, TypeSet, Options>
