import { Evaluate } from "@re-do/utils"
import { Root } from "../common.js"
import { AllowsArgs, ValidationErrors } from "../component.js"
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

/**
 * Recurse into the properties of two objects/tuples with
 * keysets that have already been validated as compatible.
 */
export const validateProperties = ({
    definition,
    assignment,
    typeSet,
    path,
    ignoreExtraneousKeys
}: AllowsArgs<Recursible.Definition>) => {
    return Object.keys(definition)
        .filter((definedKey) => definedKey in (assignment as object))
        .reduce<ValidationErrors>(
            (errors, mutualKey) => ({
                ...errors
                // ...validate({
                //     extracted: (assignment as any)[mutualKey],
                //     definition: (definition as any)[mutualKey],
                //     path: [...path, mutualKey],
                //     typeSet,
                //     seen: [],
                //     ignoreExtraneousKeys
                // })
            }),
            {}
        )
}
