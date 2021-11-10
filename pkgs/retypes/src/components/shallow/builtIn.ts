import { createNode, NodeInput, createNode } from "../parser.js"
import {
    Fragment,
    Extractable,
    Unextractable,
    extractableTypes,
    unextractableTypes,
    fragmentDef
} from "."

export namespace BuiltIn {
    export type Definition<Def extends BuiltInTypeName = BuiltInTypeName> = Def

    export type Parse<Def extends Definition> = BuiltInTypes[Def]
}

export const builtInDef = createNode({
    type: {} as BuiltIn.Definition,
    parent: fragmentDef,
    matches: (args) => args.definition in builtInTypes
})

export const builtIn = createNode(builtInDef)

export const builtInTypes = {
    ...extractableTypes,
    ...unextractableTypes
}

type BuiltInTypes = typeof builtInTypes

type BuiltInTypeName = keyof BuiltInTypes
