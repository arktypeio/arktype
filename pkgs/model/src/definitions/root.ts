import { ParseConfig, typeDefProxy } from "./internal.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"
import { Primitive } from "./primitive/index.js"
import { reroot, createParser } from "./parser.js"
import { DefinitionTypeError, definitionTypeError } from "../errors.js"

export namespace Root {
    export type Definition =
        | Primitive.Definition
        | Str.Definition
        | Obj.Definition

    export type Check<Def, Space> = Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Check<Def, Space>
        : Def extends Obj.Definition
        ? Obj.Check<Def, Space>
        : DefinitionTypeError

    export type Parse<
        Def,
        Space,
        Options extends ParseConfig
    > = Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Parse<Def, Space, Options>
        : Def extends Obj.Definition
        ? Obj.Parse<Def, Space, Options>
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
