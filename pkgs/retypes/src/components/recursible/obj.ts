import { OptionalKeys, SimpleFunction } from "@re-do/utils"
import { ParseTypeRecurseOptions, Root, ValidateRecursible } from "./common.js"
import { Recursible } from "."
import { Optional } from "../index.js"
import { Component } from "../component.js"

export namespace Obj {
    export type Definition<
        Def extends Recursible.Definition = Recursible.Definition
    > = Recursible.Definition<Def> extends any[] ? never : Def

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
        [PropName in OptionalKey]?: Def[PropName] extends Optional.Definition<
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

export const obj: Component<Recursible.Definition, Obj.Definition> = {
    matches: () => true,
    children: []
}
