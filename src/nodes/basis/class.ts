import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import { getExactBuiltinConstructorName } from "../../utils/objectKinds.js"
import { In } from "../compilation.js"
import { defineNode } from "../node.js"
import { registry } from "../registry.js"

export const ClassNode = defineNode<AbstractableConstructor>({
    kind: "divisor",
    condition: (rule) =>
        `${In} instanceof ${
            getExactBuiltinConstructorName(rule) ??
            registry().register(rule.name, rule)
        }`,
    describe: (rule) => rule.name,
    intersect: (l, r) => l
})

// readonly domain = "object"

// literalKeysOf() {
//     return prototypeKeysOf(this.child.prototype)
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
