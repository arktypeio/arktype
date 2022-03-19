import { ParseConfig, typeDefProxy } from "./internal.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"
import { Primitive } from "./primitive/index.js"
import { reroot, createParser } from "./parser.js"
import { DefinitionTypeError, definitionTypeError } from "../errors.js"
import { DefaultParseTypeOptions } from "../model.js"
import { Evaluate } from "@re-/tools"

export namespace Root {
    export type Definition =
        | Primitive.Definition
        | Str.Definition
        | Obj.Definition

    export type Parse<Def, Space> = Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Parse<Def, Space>
        : Def extends Obj.Definition
        ? Obj.Parse<Def, Space>
        : DefinitionTypeError

    export type Node = Primitive.Node | Str.Node | Obj.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig
    > = N extends Primitive.Node
        ? N
        : N extends Str.Node
        ? Str.TypeOf<N, Space, Options>
        : N extends Obj.Node
        ? Obj.TypeOf<N, Space, Options>
        : unknown

    export type Validate<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = Def extends Primitive.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, Space>
        : Def extends Obj.Definition
        ? {
              [K in keyof Def]: Validate<Def[K], Space, Options>
          }
        : DefinitionTypeError

    type Nodes = Evaluate<
        Validate<
            {
                age: "numbfer?"
                name: { first: "string|number"; last: "string" }
                address: "string"
                interests: ["string", "string"]
            },
            {},
            DefaultParseTypeOptions
        >
    >

    type Z = TypeOf<
        Parse<
            {
                age: "number?"
                name: { first: "string"; last: "string" }
            },
            {}
        >,
        {},
        DefaultParseTypeOptions
    >

    // export type Check<Def, Space> = Def extends Primitive.Definition
    //     ? Def
    //     : Def extends Str.Definition
    //     ? Str.Check<Def, Space>
    //     : Def extends Obj.Definition
    //     ? Obj.Check<Def, Space>
    //     : DefinitionTypeError

    // export type Parse<
    //     Def,
    //     Space,
    //     Options extends ParseConfig
    // > = Def extends Primitive.Definition
    //     ? Def
    //     : Def extends Str.Definition
    //     ? Str.Parse<Def, Space, Options>
    //     : Def extends Obj.Definition
    //     ? Obj.Parse<Def, Space, Options>
    //     : unknown

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
