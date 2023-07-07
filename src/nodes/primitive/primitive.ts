import type { Dict, Primitive } from "@arktype/utils"
import { NodeBase } from "../base.js"

// a primitive rule can't be an array so that it can be discriminated from a group
export type NonArray = Dict | Primitive

export abstract class PrimitiveNodeBase<
    rule extends NonArray,
    meta extends {} = {}
> extends NodeBase {
    constructor(
        public readonly rule: rule,
        public readonly meta = {} as meta
    ) {
        super()
    }
}
