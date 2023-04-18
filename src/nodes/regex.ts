import { intersectUniqueLists } from "./../utils/generics.js"
import type { CompilationState } from "./node.js"
import { Node } from "./node.js"

export class RegexNode extends Node<typeof RegexNode> {
    constructor(sources: string | string[]) {
        super(RegexNode, typeof sources === "string" ? [sources] : sources)
    }

    static compileChildren(sources: string[], s: CompilationState) {
        return sources.sort().map((source) => ({
            condition: `!/${source}/.test(${s.data})`,
            problem: s.problem("regex", source)
        }))
    }

    intersect(other: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.child, other.child))
    }
}
