import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Str, Num, str } from "."
import { Root } from "../common.js"
import { createNode, createParser } from "../parser.js"

export namespace Shallow {
    export type Definition<Def extends string | number = string | number> = Def

    export type Validate<
        Def extends Definition,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends Num.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Num.Definition<infer Value>
        ? Value
        : Def extends Str.Definition
        ? Str.Parse<Def, TypeSet, Options>
        : DefinitionTypeError

    export const node = createNode({
        type: {} as Shallow.Definition,
        parent: Root.node,
        matches: ({ definition }) =>
            typeof definition === "number" || typeof definition === "string"
    })

    export const shallow = createParser(node, [str])
}
