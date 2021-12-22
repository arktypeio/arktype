import { ParseConfig, typeDefProxy } from "./internal.js"
import { Obj } from "./obj"
import { Str } from "./str"
import { Primitive } from "./primitive"
import { reroot, createParser } from "./parser.js"
import { DefinitionTypeError, definitionTypeError } from "../errors.js"

export namespace Root {
    export type Definition =
        | Primitive.Definition
        | Str.Definition
        | Obj.Definition

    export type Check<Def, Typespace> = Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.FormatAndCheck<Def, Typespace>
        : Def extends Obj.Definition
        ? Obj.Check<Def, Typespace>
        : DefinitionTypeError

    export type Parse<
        Def,
        Typespace,
        Options extends ParseConfig
    > = Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.FormatAndParse<Def, Typespace, Options>
        : Def extends Obj.Definition
        ? Obj.Parse<Def, Typespace, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => reroot,
            children: () => [Primitive.delegate, Str.delegate, Obj.delegate],
            fallback: (definition, { path }) => {
                throw new Error(definitionTypeError(definition, path))
            }
        },
        { matches: () => true }
    )
}
