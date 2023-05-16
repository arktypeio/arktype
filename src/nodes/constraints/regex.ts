import { intersectUniqueLists } from "../../utils/lists.js"
import { type CompilationState, In } from "../compilation.js"
import { Node } from "../node.js"

export class RegexNode extends Node<"regex", readonly string[]> {
    // constructor(public children: readonly string[]) {
    //     super(
    //         "regex",
    //         children.map(RegexNode.compileExpression).sort().join(" && ") ??
    //             "true"
    //     )
    // }

    static compileExpression(source: string) {
        return `${In}.match(/${source}/)`
    }

    toString() {
        const literals = this.children.map((_) => `/${_}/`)
        return literals.length === 1
            ? literals[0]
            : `expressions ${literals.join(", ")}`
    }

    compileTraverse(s: CompilationState) {
        return this.children
            .map((source) =>
                s.ifNotThen(
                    RegexNode.compileExpression(source),
                    s.problem("regex", source)
                )
            )
            .join("\n")
    }

    intersectNode(r: RegexNode) {
        return new RegexNode(...intersectUniqueLists(this.children, r.children))
    }
}
