import { ParseConfig } from "./internal.js"
import { Obj } from "./object"
import { Str } from "./string"
import { reroot, createParser } from "./parser.js"
import { typeDefProxy } from "./internal.js"

import { DefinitionTypeError, definitionTypeError } from "../errors.js"

type RootDefinition = Str.Definition | Obj.Definition

export namespace Root {
    export type Definition<Def extends RootDefinition = RootDefinition> = Def

    export type Validate<Def, Typespace> = Def extends Str.Definition
        ? Str.Validate<Def, Typespace>
        : Def extends Obj.Definition
        ? Obj.Validate<Def, Typespace>
        : DefinitionTypeError

    export type TypeDefinitionOptions = {
        extractTypesReferenced?: boolean
    }

    export type Parse<
        Def,
        Typespace,
        Options extends ParseConfig
    > = Def extends Str.Definition
        ? Str.Parse<Def, Typespace, Options>
        : Def extends Obj.Definition
        ? Obj.Parse<Def, Typespace, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => reroot,
            children: () => [Str.delegate, Obj.delegate],
            fallback: (definition, { path }) => {
                throw new Error(definitionTypeError(definition, path))
            }
        },
        { matches: () => true }
    )
}
