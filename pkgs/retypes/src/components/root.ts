import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Shallow } from "./shallow/shallow.js"
import { Recursible } from "./recursible/recursible.js"
import {
    reroot,
    ParseArgs,
    createParser,
    UnimplementedParserMethods,
    GetInheritedMethods
} from "./parser.js"
import { DeepEvaluate, Evaluate } from "@re-do/utils"

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

    export const parse = createParser({
        type: {} as Root.Definition,
        parent: () => reroot,
        children: [Shallow.delegate],
        matches: ({ definition }) => true
    })
    parse({ definition: "", ...({} as any) })
}
