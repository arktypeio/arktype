import { typeDefProxy } from "./internal.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"
import { Literal } from "./literal/index.js"
import { reroot, createParser } from "./parser.js"
import {
    BadDefinitionType,
    DefinitionTypeError,
    definitionTypeError
} from "../errors.js"

export namespace Root {
    export type Definition =
        | Literal.Definition
        | Str.Definition
        | Obj.Definition

    export type Parse<Def, Resolutions, Context> = Def extends BadDefinitionType
        ? DefinitionTypeError
        : Def extends Literal.Definition
        ? Literal.Parse<Def>
        : Def extends Str.Definition
        ? Str.Parse<Def, Resolutions, Context>
        : Def extends Obj.Definition
        ? Obj.Parse<Def, Resolutions, Context>
        : DefinitionTypeError

    export type Node = Literal.Node | Str.Node | Obj.Node

    export type TypeOf<N, Resolutions, Options> = N extends Literal.Node
        ? Literal.TypeOf<N>
        : N extends Str.Node
        ? Str.TypeOf<N, Resolutions, Options>
        : N extends Obj.Node
        ? Obj.TypeOf<N, Resolutions, Options>
        : unknown

    export type Validate<Def, Space> = Def extends BadDefinitionType
        ? DefinitionTypeError
        : Def extends Literal.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, Space>
        : Def extends Obj.Definition
        ? {
              [K in keyof Def]: Validate<Def[K], Space>
          }
        : DefinitionTypeError

    export type ReferencesOf<Def, Resolutions, Options> =
        Def extends Literal.Definition
            ? Literal.ReferencesOf<Def, Options>
            : Def extends Str.Definition
            ? Str.ReferencesOf<Def, Resolutions, Options>
            : Def extends Obj.Definition
            ? {
                  [K in keyof Def]: ReferencesOf<Def[K], Resolutions, Options>
              }
            : DefinitionTypeError

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            // Somehow RegExp breaks this, but it's internal so not important
            // @ts-ignore
            type,
            parent: () => reroot,
            children: () => [Literal.delegate, Str.delegate, Obj.delegate],
            fallback: (definition, { path }) => {
                throw new Error(definitionTypeError(definition, path))
            }
        },
        { matches: () => true }
    )
}
