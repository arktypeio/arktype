import { ParseConfig } from "./internal.js"
import { Shallow } from "./shallow/shallow.js"
import { Recursible } from "./recursible/recursible.js"
import { reroot, createParser } from "./parser.js"
import { typeDefProxy } from "./internal.js"
import { DefinitionTypeError, definitionTypeError } from "./errors.js"

type RootDefinition = Shallow.Definition | Recursible.Definition

export namespace Root {
    export type Definition<Def extends RootDefinition = RootDefinition> = Def

    export type Validate<Def, TypeSet> = Def extends Shallow.Definition
        ? Shallow.Validate<Def, TypeSet>
        : Def extends Recursible.Definition
        ? Recursible.Validate<Def, TypeSet>
        : DefinitionTypeError

    export type TypeDefinitionOptions = {
        extractTypesReferenced?: boolean
    }

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseConfig
    > = Def extends Shallow.Definition
        ? Shallow.Parse<Def, TypeSet, Options>
        : Def extends Recursible.Definition
        ? Recursible.Parse<Def, TypeSet, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => reroot,
        children: () => [Shallow.delegate, Recursible.delegate],
        fallback: (definition, { path }) => {
            throw new Error(definitionTypeError(definition, path))
        },
        matches: () => true
    })
}
