import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Str, Num } from "."
import { root, Root } from "../common.js"
import { component, ComponentInput } from "../component.js"

export namespace Shallow {
    export type Definition<Def extends string | number = string | number> = Def

    export type Validate<
        Def extends Definition,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends Num.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Num.Definition<infer Value>
        ? Value
        : Def extends Str.Definition
        ? Str.Parse<Def, TypeSet, Options>
        : DefinitionTypeError
}

export const shallow = component({
    name: "shallow",
    def: {} as Shallow.Definition,
    parent: root,
    matches: ({ definition }) =>
        typeof definition === "number" || typeof definition === "string",
    children: []
})
