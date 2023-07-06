import type { NodeKind } from "../base.js"
import { NodeBase } from "../base.js"

export class PredicateNode extends NodeBase<[], {}> {
    readonly kind = "predicate"

    constructor(input: [], meta: {}) {
        super(input, meta)
    }

    compile() {
        return ""
    }

    describe() {
        return ""
    }
}

export const constraintPrecedence = {
    // basis checks
    domain: 1,
    class: 1,
    unit: 1,
    // shallow checks
    bound: 2,
    divisor: 2,
    regex: 2,
    // deep checks
    properties: 3,
    // narrows
    narrow: 4
} as const satisfies { [k in NodeKind]?: number }

export type ConstraintKind = keyof typeof constraintPrecedence
