import { In } from "../../compile/compile.js"
import { registry } from "../../compile/registry.js"
import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import { getExactBuiltinConstructorName } from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisNode } from "./basis.js"

export type ClassNode = BasisNode<{
    rule: AbstractableConstructor
    level: "class"
}>

export const ClassNode = defineNodeKind<ClassNode>({
    level: "class",
    compile: (rule) =>
        `${In} instanceof ${
            getExactBuiltinConstructorName(rule) ??
            registry().register(rule.name, rule)
        }`,
    construct: (base) => Object.assign(base, { domain: () => "object" }),
    describe: (node) => node.rule.name
})

// extendsOneOf(...baseConstructors: AbstractableConstructor[]) {
//     return baseConstructors.some((base) =>
//         constructorExtends(this.rule, base)
//     )
// }

// literalKeysOf() {
//     return prototypeKeysOf(this.rule.prototype)
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
