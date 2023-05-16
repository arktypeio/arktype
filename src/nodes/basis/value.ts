import type { Domain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { type Constructor, prototypeKeysOf } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { CompilationState } from "../compilation.js"
import { compileSerializedValue, In } from "../compilation.js"
import { BasisNode } from "./basis.js"

export class ValueNode extends BasisNode<"value"> {
    // constructor(public child: unknown) {
    //     super("value", ValueNode.compile(child))
    //     this.domain = domainOf(child)
    //     this.children = [child]
    // }

    readonly subclass = ValueNode

    static readonly kind = "basis"

    get child() {
        return this.children[0][1]
    }

    get domain() {
        return domainOf(this.child)
    }

    static compile(value: unknown) {
        return `${In} === ${compileSerializedValue(value)}`
    }

    toString() {
        return stringify(this.child)
    }

    getConstructor(): Constructor | undefined {
        return this.domain === "object"
            ? Object(this.child).constructor
            : undefined
    }

    literalKeysOf(): Key[] {
        if (this.child === null || this.child === undefined) {
            return []
        }
        return [...prototypeKeysOf(this.child), ...Object.keys(this.child)]
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("value", this.child))
    }
}
