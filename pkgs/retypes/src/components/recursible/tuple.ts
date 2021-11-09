import { Component } from "../component.js"
import { ValidateRecursible, Root, ParseTypeRecurseOptions } from "./common.js"
import { Recursible } from "./recursible.js"

export namespace Tuple {
    export type Definition<Def extends Root.Definition[] = Root.Definition[]> =
        Def

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

export const tuple: Component<Recursible.Definition, Tuple.Definition> = {
    matches: () => true,
    children: []
}
