import {
    Evaluate,
    isRecursible,
    Recursible as ExtractRecursible
} from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import { Root } from "../common.js"
import { createNode, createParser, NodeInput } from "../parser.js"
import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Obj, Tuple } from "./index.js"

export namespace Recursible {
    export type Definition<
        Def extends { [K in string]: any } = { [K in string]: any }
    > = Def extends ExtractRecursible<Def> ? Def : never

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends Tuple.Definition
        ? Tuple.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : Def extends Obj.Definition
        ? Obj.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Tuple.Definition
        ? Evaluate<Tuple.Parse<Def, TypeSet, Options>>
        : Def extends Obj.Definition
        ? Evaluate<Obj.Parse<Def, TypeSet, Options>>
        : DefinitionTypeError

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: Root.node,
        matches: ({ definition }) => isRecursible(definition)
    })

    export const parser = createParser(node, Tuple.parser, Obj.parser)
}
