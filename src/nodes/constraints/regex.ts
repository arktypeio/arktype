import { intersectUniqueLists } from "../../utils/lists.js"
import { In } from "../compilation.js"
import { BaseNode, defineNode } from "../node.js"

export const RegexNode = defineNode(
    class RegexNode extends BaseNode<string[]> {
        readonly kind = "regex"

        static compile(sources: string[]) {
            return sources.map(compileExpression).sort()
        }

        computeIntersection(other: this) {
            return intersectUniqueLists(this.rule, other.rule)
        }

        describe() {
            const literals = this.rule.map((_) => `/${_}/`)
            return literals.length === 1
                ? literals[0]
                : `expressions ${literals.join(", ")}`
        }
    }
)

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
