import type { CompilationState, NodeSubclass } from "./node.js"
import { Node } from "./node.js"
import type { ConstraintKind } from "./predicate.js"

export abstract class RuleNode<
    subclass extends NodeSubclass<subclass> = NodeSubclass<any>
> extends Node<subclass> {
    abstract kind: ConstraintKind

    compileTraversal(s: CompilationState) {
        return `if (!(${this.key})) {
            ${s.problem(this.kind as never, "" as never)}
        }`
    }
}
