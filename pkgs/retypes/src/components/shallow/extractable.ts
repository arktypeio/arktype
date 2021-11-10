import { createNode, NodeInput, createNode } from "../parser.js"
import { builtInDef, Fragment } from "."

export namespace Extractable {
    export type Definition<
        Def extends ExtractableTypeName = ExtractableTypeName
    > = Def
}

export const extractableDef = createNode({
    type: {} as Extractable.Definition,
    parent: builtInDef,
    matches: ({ definition }) => definition in extractableTypes
})

export const extractable = createNode(extractableDef)

// These are the non-literal types we can extract from a value at runtime
export const extractableTypes = {
    bigint: BigInt(0),
    true: true as true,
    false: false as false,
    null: null,
    symbol: Symbol(),
    undefined: undefined,
    function: (...args: any[]) => null as any
}

type ExtractableTypes = typeof extractableTypes

type ExtractableTypeName = keyof ExtractableTypes
