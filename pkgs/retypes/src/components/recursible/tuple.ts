import { Root, UnvalidatedDefinition, ParseTypeRecurseOptions } from ".."
import { ValidateRecursible } from "./common.js"

export namespace Tuple {
    export type Definition<
        Def extends UnvalidatedDefinition[] = UnvalidatedDefinition[]
    > = Def

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateRecursible<Def, DeclaredTypeName, ExtractTypesReferenced>

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = {
        [Index in keyof Def]: Root.Parse<Def[Index], TypeSet, Options>
    }
}
