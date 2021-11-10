import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { shallowNode, Shallow, shallow } from "./shallow"
import { Recursible } from "./recursible"
import { createParser, createNode } from "./parser.js"

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

    export const node = createNode({
        type: {} as Root.Definition,
        parent: {
            type: {} as Root.Definition,
            implements: {},
            inherits: {}
        },
        matches: ({ definition }) => true
    })

    export const parser = createParser(node, [shallow])
}
