import { intersectUniqueLists } from "../../utils/lists.js"
import { In } from "../compilation.js"
import { defineNode } from "../node.js"

export const RegexNode = defineNode(
    (sources: string[]) => sources.map(compileExpression).sort(),
    intersectUniqueLists,
    (base) =>
        class RegexNode extends base {
            readonly kind = "regex"

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
