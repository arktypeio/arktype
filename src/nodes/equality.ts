import { hasDomain } from "../utils/domains.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"
import { registerValue } from "./registry.js"

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
