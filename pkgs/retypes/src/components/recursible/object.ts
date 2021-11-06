import { OptionalKeys } from "@re-do/utils"
import {
    OptionalDefinition,
    UnvalidatedRecursibleDefinition,
    ParseTypeRecurseOptions
} from "../common.js"
import { Root } from "../root.js"
import { ValidateRecursible } from "./common.js"

export namespace Obj {
    export type Definition<
        Def extends UnvalidatedRecursibleDefinition = UnvalidatedRecursibleDefinition
    > = Def

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateRecursible<Def, DeclaredTypeName, ExtractTypesReferenced>

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        OptionalKey extends keyof Def = OptionalKeys<Def>,
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = {
        [PropName in OptionalKey]?: Def[PropName] extends OptionalDefinition<
            infer OptionalType
        >
            ? Root.Parse<OptionalType, TypeSet, Options>
            : `Expected property ${PropName & string} to be optional.`
    } &
        {
            [PropName in RequiredKey]: Root.Parse<
                Def[PropName],
                TypeSet,
                Options
            >
        }
}
