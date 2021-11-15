import { RemoveSpaces } from "@re-do/utils"
import { ParseTypeRecurseOptions } from "./common.js"
import { UnknownTypeError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { Optional } from "./optional.js"
import { Shallow } from "./shallow.js"
import { createParser } from "../parser.js"
import { typeDefProxy } from "../../common.js"

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

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Shallow.parse,
        matches: (definition) => typeof definition === "string",
        children: () => [Optional.delegate, Fragment.delegate]
    })

    export const delegate = parse as any as Definition
}
