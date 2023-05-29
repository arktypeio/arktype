import { intersectUniqueLists } from "../../utils/lists.js"
import { In } from "../compilation.js"
import { BaseNode } from "../node.js"

export class RegexNode extends BaseNode<"regex"> {
    constructor(public rule: string[]) {
        const subconditions = rule.sort().map(compileExpression)
        const condition = subconditions.join(" && ")
        if (BaseNode.nodes.regex[condition]) {
            return BaseNode.nodes.regex[condition]
        }
        super("regex", condition)
    }

    computeIntersection(other: this) {
        return new RegexNode(intersectUniqueLists(this.rule, other.rule))
    }

    toString() {
        const literals = this.rule.map((_) => `/${_}/`)
        return literals.length === 1
            ? literals[0]
            : `expressions ${literals.join(", ")}`
    }
}

// return this.children
// .map((source) =>
//     s.ifNotThen(
//         RegexNode.compileExpression(source),
//         s.problem("regex", source)
//     )
// )
// .join("\n")

const compileExpression = (source: string) => {
    return `${In}.match(/${source}/)`
}
