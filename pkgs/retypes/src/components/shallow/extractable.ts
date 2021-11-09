import { component, ComponentInput } from "../component.js"
import { Fragment } from "."

export namespace Extractable {
    export type Definition<
        Def extends ExtractableTypeName = ExtractableTypeName
    > = Def
}

export const extractable = component<
    Fragment.Definition,
    Extractable.Definition
>({
    matches: ({ definition }) => definition in extractableTypes,
    children: []
})

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
