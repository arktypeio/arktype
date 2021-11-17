import { DeepTreeOf, Evaluate } from "@re-do/utils"
import { Root, ExtractableDefinition } from "../common.js"
import {
    AllowsOptions,
    HandlesMethods,
    ParseContext,
    ParseResult,
    ValidationErrors
} from "../parser.js"
import { Recursible } from "./recursible.js"

export * from "../common.js"

export type ValidateRecursible<
    Def,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean
> = Evaluate<
    {
        [PropName in keyof Def]: Root.Validate<
            Def[PropName],
            DeclaredTypeName,
            ExtractTypesReferenced
        >
    }
>

// export type ValidatePropertiesArgs = {
//     def: Recursible.Definition
//     ctx: ParseContext<Recursible.Definition>
//     valueType
// }

/**
 * Recurse into the properties of two objects/tuples with
 * keysets that have already been validated as compatible.
 */
export const validateProperties: NonNullable<
    HandlesMethods<
        Recursible.Definition,
        Record<string | number, ParseResult<Recursible.Definition>>
    >["allows"]
> = ({ components }, valueType, opts) =>
    Object.keys(components)
        .filter((definedKey) => definedKey in (valueType as object))
        .reduce(
            (errors, mutualKey) => ({
                ...errors,
                ...components[mutualKey].allows(valueType, opts)
            }),
            {} as ValidationErrors
        )
