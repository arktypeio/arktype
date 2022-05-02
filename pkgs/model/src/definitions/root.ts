import {
    typeDefProxy,
    Precedence,
    ShallowNode,
    BadDefinitionType,
    DefinitionTypeError,
    definitionTypeError,
    UnknownTypeError
} from "./internal.js"
import { Obj, Map, Tuple } from "./obj/index.js"
import {
    ArrowFunction,
    Union,
    Intersection,
    Constraint,
    List
} from "./str/index.js"
import { Str } from "./str/index.js"
import { Literal } from "./literal/index.js"
import { reroot, createParser } from "./parser.js"

export namespace Root {
    export type Parse<Def, Resolutions, Context> = Def extends BadDefinitionType
        ? DefinitionTypeError
        : Precedence<
              [
                  Obj.Parse<Def, Resolutions, Context>,
                  Literal.Parse<Def>,
                  Str.Parse<Def, Resolutions, Context>,
                  UnknownTypeError<Def extends string ? Def : "your definition">
              ]
          >

    export type TypeOf<N, Resolutions, Options> = N extends ShallowNode
        ? N["type"]
        : N["kind"] extends "tuple"
        ? Tuple.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "map"
        ? Map.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "arrowFunction"
        ? ArrowFunction.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "union"
        ? Union.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "intersection"
        ? Intersection.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "constraint"
        ? Constraint.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "list"
        ? List.TypeOf<N, Resolutions, Options>
        : unknown

    export type Validate<N, Resolutions> = N["kind"] extends "map"
        ? Map.Validate<N, Resolutions>
        : N["kind"] extends "tuple"
        ? Tuple.Validate<N, Resolutions>
        : Str.Validate<N, "">

    export type ReferencesOf<Def, Resolutions, Options> =
        Def extends Literal.Definition
            ? Literal.ReferencesOf<Def, Options>
            : Def extends Str.Definition
            ? Str.ReferencesOf<Def, Resolutions, Options>
            : Def extends object
            ? {
                  [K in keyof Def]: ReferencesOf<Def[K], Resolutions, Options>
              }
            : DefinitionTypeError

    export const type = typeDefProxy as object

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
