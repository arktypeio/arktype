import { In } from "../../compile/compile.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import { defineNodeKind } from "../node.js"
import type { PrimitiveNode } from "./primitive.js"

export type RegexNode = PrimitiveNode<string[]>

export const regexNode = defineNodeKind<RegexNode, string | string[]>(
    {
        kind: "regex",
        parse: listFrom,
        compile: (rule) => ({
            precedence: "shallow",
            condition: rule.sort().map(compileExpression).join(" && ")
        }),
        intersect: (l, r): RegexNode =>
            regexNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => {
        const literals = base.rule.map((_) => `/${_}/`)
        const description =
            literals.length === 1
                ? literals[0]
                : `expressions ${literals.join(", ")}`
        return { description }
    }
)

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
