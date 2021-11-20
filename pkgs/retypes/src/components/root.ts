import {
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "./common.js"
import { Shallow } from "./shallow/shallow.js"
import { Recursible } from "./recursible/recursible.js"
import { reroot, createParser } from "./parser.js"
import { typeDefProxy } from "../common.js"
import { DefinitionTypeError, definitionTypeError } from "./errors.js"

type RootDefinition = Shallow.Definition | Recursible.Definition

export namespace Root {
    export type Definition<Def extends RootDefinition = RootDefinition> = Def

    export type Validate<
        Def,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = Def extends Shallow.Definition
        ? Shallow.Validate<Def, TypeSet, Options>
        : Def extends Recursible.Definition
        ? Recursible.Validate<Def, TypeSet, Options>
        : DefinitionTypeError
    //  [     { Def: Def; TypeSet: TypeSet; Options: Options }
    //   ]

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
