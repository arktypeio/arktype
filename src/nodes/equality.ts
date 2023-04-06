import { hasDomain } from "../utils/domains.ts"
import type { SerializablePrimitive } from "../utils/serialize.ts"
import { serializePrimitive } from "../utils/serialize.ts"
import type { ComparisonState, CompilationState } from "./node.ts"
import { Node } from "./node.ts"
import { registerValue } from "./registry.ts"

export class EqualityNode<rule = unknown> extends Node<typeof EqualityNode> {
    constructor(rule: rule) {
        super(EqualityNode, rule)
    }

    static intersection(l: EqualityNode, r: EqualityNode, s: ComparisonState) {
        return l === r ? l : s.addDisjoint("value", l, r)
    }

    static compile(value: unknown, s: CompilationState) {
        const serialized =
            hasDomain(value, "object") || typeof value === "symbol"
                ? registerValue(typeof value, value)
                : serializePrimitive(value as SerializablePrimitive)
        return s.check("value", `data === ${serialized}`, value)
    }
}
