import { In } from "../../compile/compile.js"
import { intersectUniqueLists, listFrom } from "../../../dev/utils/lists.ts"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export type RegexNode = BaseNode<string[]>

export const regexNode = defineNodeKind<RegexNode, string | string[]>(
    {
        kind: "regex",
        parse: (input) => listFrom(input).sort(),
        compile: (rule) => rule.map((source) => `${In}.match(/${source}/)`),
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

// return this.children
// .map((source) =>
//     s.ifNotThen(
//         RegexNode.compileExpression(source),
//         s.problem("regex", source)
//     )
// )
// .join("\n")
