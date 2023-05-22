import { intersectUniqueLists } from "../../utils/lists.js"
import { In } from "../compilation.js"
import { defineNode } from "../node.js"

export const RegexNode = defineNode<string[]>()({
    kind: "regex",
    condition: (sources) =>
        sources.map(compileExpression).sort().join(" && ") ?? "true",
    describe: (sources) => {
        const literals = sources.map((_) => `/${_}/`)
        return literals.length === 1
            ? literals[0]
            : `expressions ${literals.join(", ")}`
    },
    intersect: intersectUniqueLists
})

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
