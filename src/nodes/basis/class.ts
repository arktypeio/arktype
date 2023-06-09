import { In } from "../../compile/compile.js"
import { registry } from "../../compile/registry.js"
import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import {
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ClassNode
    extends BasisNode<"class", AbstractableConstructor> {}

export const ClassNode = defineNodeKind<ClassNode>({
    kind: "class",
    compile: (rule) =>
        `${In} instanceof ${
            getExactBuiltinConstructorName(rule) ??
            registry().register(rule.name, rule)
        }`,
    extend: (base) => ({
        domain: "object",
        literalKeys: prototypeKeysOf(base.rule.prototype)
    }),
    intersect: intersectBases,
    describe: (node) => node.rule.name
})

// extendsOneOf(...baseConstructors: AbstractableConstructor[]) {
//     return baseConstructors.some((base) =>
//         constructorExtends(this.rule, base)
//     )
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
