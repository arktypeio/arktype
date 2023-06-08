import { In } from "../../compile/compile.js"
import { registry } from "../../compile/registry.js"
import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import { getExactBuiltinConstructorName } from "../../utils/objectKinds.js"
import type { BasisNode } from "./basis.js"
import { defineBasisNode } from "./basis.js"

export type ClassNode = BasisNode<{
    rule: AbstractableConstructor
    level: "class"
}>

export const ClassNode = defineBasisNode<ClassNode>({
    domain: () => "object",
    level: "class",
    compile: (rule) =>
        `${In} instanceof ${
            getExactBuiltinConstructorName(rule) ??
            registry().register(rule.name, rule)
        }`,
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
