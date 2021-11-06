import { Evaluate } from "@re-do/utils"
import { Root } from ".."

export type ValidateRecursible<
    Def,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean
> = Evaluate<
    {
        [PropName in keyof Def]: Root.Validate<
            Def[PropName],
            DeclaredTypeName,
            { extractTypesReferenced: ExtractTypesReferenced }
        >
    }
>
