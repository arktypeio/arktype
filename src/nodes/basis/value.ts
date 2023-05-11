import type { Domain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { type constructor, prototypeKeysOf } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { CompilationState } from "../compilation.js"
import { compileSerializedValue, In } from "../compilation.js"
import { BasisNode } from "./basis.js"

export class ValueNode extends BasisNode {
    domain: Domain

    constructor(public value: unknown) {
        super("value", ValueNode.compile(value))
        this.domain = domainOf(value)
    }

    static compile(value: unknown) {
        return `${In} === ${compileSerializedValue(value)}`
    }

    toString() {
        return stringify(this.value)
    }

    getConstructor(): constructor | undefined {
        return this.domain === "object"
            ? Object(this.value).constructor
            : undefined
    }

    literalKeysOf(): Key[] {
        if (this.value === null || this.value === undefined) {
            return []
        }
        return [...prototypeKeysOf(this.value), ...Object.keys(this.value)]
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("value", this.value))
    }
}
