import { intersectUniqueLists } from "./../utils/generics.js"
import type { CompilationState } from "./node.js"
import { Node } from "./node.js"

export class RegexNode extends Node<typeof RegexNode> {
    constructor(sources: string | string[]) {
        super(RegexNode, typeof sources === "string" ? [sources] : sources)
    }

    static checks(sources: string[], s: CompilationState) {
        return sources.map((source) => {
            const check = `/${source}/.test(${s.data})`
            return s.kind === "traverse"
                ? s.traverse("regex", check, source)
                : check
        })
    }

    // c.problem(
    //     "regex",
    //     "`" + source + "`"
    // )}

    intersect(other: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.child, other.child))
    }
}
