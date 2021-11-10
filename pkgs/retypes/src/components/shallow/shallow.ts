import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Str, Num } from "."
import { rootDefinition, Root } from "../common.js"
import {
    defineComponent,
    ComponentDefinitionInput,
    component
} from "../component.js"
import { Evaluate } from "@re-do/utils"

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

export const shallow = defineComponent({
    name: "shallow",
    def: {} as Shallow.Definition,
    parent: rootDefinition,
    matches: ({ definition }) =>
        typeof definition === "number" || typeof definition === "string",
    implements: {
        allows: ({ definition }) => ({})
    }
})

export const shallow2 = component(shallow, [])
