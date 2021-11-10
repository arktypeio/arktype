import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { shallow, Shallow, Str } from "./shallow"
import { recursible, Recursible } from "./recursible"
import { component, ComponentInput } from "./component.js"

type RootDefinition = Shallow.Definition | Recursible.Definition

export namespace Root {
    export type Definition<Def extends RootDefinition = RootDefinition> = Def

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends Shallow.Definition
        ? Shallow.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : Def extends Recursible.Definition
        ? Recursible.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : DefinitionTypeError

    export type TypeDefinitionOptions = {
        extractTypesReferenced?: boolean
    }

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Shallow.Definition
        ? Shallow.Parse<Def, TypeSet, Options>
        : Def extends Recursible.Definition
        ? Recursible.Parse<Def, TypeSet, Options>
        : DefinitionTypeError
}

export const root = component({
    name: "root",
    def: {} as Root.Definition,
    parent: { implements: {}, inherits: {}, def: {} as Root.Definition },
    matches: ({ definition }) => true,
    children: ["shallow", "recursible"],
    implements: {
        getDefault: ({ definition }) => true
    }
})
