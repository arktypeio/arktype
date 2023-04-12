import { hasDomain } from "../utils/domains.js"
import { register } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"

export class EqualityNode<value = unknown> extends Node<typeof EqualityNode> {
    constructor(value: value) {
        super(EqualityNode, value)
    }

    intersect(other: EqualityNode, s: ComparisonState) {
        return this === other ? this : s.addDisjoint("value", this, other)
    }

    static compile(value: unknown, s: CompilationState) {
        const serialized =
            hasDomain(value, "object") || typeof value === "symbol"
                ? register(typeof value, value)
                : serializePrimitive(value as SerializablePrimitive)
        return s.check("value", `data === ${serialized}`, value)
    }
}
