import { In } from "../../compile/compile.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import type { ConditionNode } from "../node.js"
import { nodeCache } from "../node.js"

export class RegexNode implements ConditionNode<"regex"> {
    constructor(public rule: string[]) {
        const subconditions = rule.sort().map(compileExpression)
        const condition = subconditions.join(" && ")
        if (nodeCache.regex[condition]) {
            return nodeCache.regex[condition]!
        }
    }

    intersect(other: this) {
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
