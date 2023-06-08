import { In } from "../../compile/compile.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { defineNodeKind } from "../node.js"

export const RegexNode = defineNodeKind({
    kind: "regex",
    compile: (rule: string[]) => {
        const subconditions = rule.sort().map(compileExpression)
        return subconditions.join(" && ")
    },
    intersect: (l, r) => intersectUniqueLists(l.rule, r.rule),
    describe: (node) => {
        const literals = node.rule.map((_) => `/${_}/`)
        return literals.length === 1
            ? literals[0]
            : `expressions ${literals.join(", ")}`
    }
})

const compileExpression = (source: string) => {
    return `${In}.match(/${source}/)`
}

// return this.children
// .map((source) =>
//     s.ifNotThen(
//         RegexNode.compileExpression(source),
//         s.problem("regex", source)
//     )
// )
// .join("\n")
