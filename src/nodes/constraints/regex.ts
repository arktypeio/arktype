import { intersectUniqueLists } from "../../utils/lists.js"
import { type CompilationState, In } from "../compilation.js"
import { Node } from "../node.js"

export class RegexNode extends Node<"regex"> {
    constructor(public children: string[]) {
        // TODO: true case?
        // if (sources.length === 0) {
        //     throwInternalError(`Unexpectedly received empty regex list`)
        // }
        super(
            "regex",
            children.sort().map(RegexNode.compileExpression).join(" && ")
        )
    }

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
        return new RegexNode(intersectUniqueLists(this.children, r.children))
    }
}
