import { TypeOfContext, ParseTypeContext, typeDefProxy } from "./internal.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"
import { Primitive } from "./primitive/index.js"
import { reroot, createParser } from "./parser.js"
import {
    BadDefinitionType,
    DefinitionTypeError,
    definitionTypeError
} from "../errors.js"
import { ReferencesTypeConfig } from "../internal.js"

export namespace Root {
    export type Definition =
        | Primitive.Definition
        | Str.Definition
        | Obj.Definition

    export type Parse<
        Def,
        Resolutions,
        Context extends ParseTypeContext
    > = Def extends BadDefinitionType
        ? DefinitionTypeError
        : Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Parse<Def, Resolutions, Context>
        : Def extends Obj.Definition
        ? Obj.Parse<Def, Resolutions, Context>
        : DefinitionTypeError

    export type Node = Primitive.Node | Str.Node | Obj.Node

    export type TypeOf<
        N,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = N extends Primitive.Node
        ? N
        : N extends Str.Node
        ? Str.TypeOf<N, Resolutions, Options>
        : N extends Obj.Node
        ? Obj.TypeOf<N, Resolutions, Options>
        : unknown

    export type Validate<Def, Space> = Def extends BadDefinitionType
        ? DefinitionTypeError
        : Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, Space>
        : Def extends Obj.Definition
        ? {
              [K in keyof Def]: Validate<Def[K], Space>
          }
        : DefinitionTypeError

    export type ReferencesOf<
        Def,
        Resolutions,
        Options extends ReferencesTypeConfig
    > = Def extends Primitive.Definition
        ? Primitive.References<Def, Options>
        : Def extends Str.Definition
        ? Str.ReferencesOf<Def, Resolutions, Options>
        : Def extends Obj.Definition
        ? {
              [K in keyof Def]: ReferencesOf<Def[K], Resolutions, Options>
          }
        : DefinitionTypeError

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
