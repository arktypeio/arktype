import { In } from "../../compile/compile.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import type { Node } from "../node.js"
import { defineNodeKind } from "../node.js"

export type RegexNode = Node<{
    kind: "regex"
    rule: string[]
    intersected: RegexNode
}>

export const RegexNode = defineNodeKind<RegexNode>({
    kind: "regex",
    compile: (rule) => {
        const subconditions = rule.sort().map(compileExpression)
        return subconditions.join(" && ")
    },
    intersect: (l, r): RegexNode =>
        RegexNode(intersectUniqueLists(l.rule, r.rule)),
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
