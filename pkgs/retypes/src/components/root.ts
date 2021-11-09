import { ParseTypeRecurseOptions, DefinitionTypeError, Root } from "./common.js"
import { shallow, Shallow } from "./shallow"
import { recursible, Recursible } from "./recursible"
import { ComponentInput } from "./component.js"

export type RootDefinition = Shallow.Definition | Recursible.Definition

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

export const root: ComponentInput<Root.Definition> = {
    matches: () => true,
    children: [shallow, recursible]
}
