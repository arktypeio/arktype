import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import {
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../utils/objectKinds.js"
import { In } from "../compilation.js"
import { Disjoint } from "../disjoint.js"
import { defineNode } from "../node.js"
import { registry } from "../registry.js"
import { BasisNode } from "./basis.js"

// export type ClassNode = ReturnType<typeof ClassNode>

export class ClassNode extends BasisNode<"class", AbstractableConstructor> {
    readonly kind = "basis"
    readonly domain = "object"
    readonly level = "class"

    static compile(rule: AbstractableConstructor) {
        return [
            `${In} instanceof ${
                getExactBuiltinConstructorName(rule) ??
                registry().register(rule.name, rule)
            }`
        ]
    }

    literalKeysOf() {
        return prototypeKeysOf(this.rule.prototype)
    }

    describe() {
        return this.rule.name
    }
}

export const classNode = defineNode(ClassNode)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
