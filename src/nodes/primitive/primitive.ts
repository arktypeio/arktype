import type { Dict } from "@arktype/utils"
import { NodeBase } from "../base.js"

export abstract class PrimitiveNodeBase<
    rule,
    meta extends Dict
> extends NodeBase {
    constructor(
        public readonly rule: rule,
        public readonly meta = {} as meta
    ) {
        super()
    }
}
