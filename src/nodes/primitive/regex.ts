import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export type RegexNode = BaseNode<string[]>

export const regexNode = defineNodeKind<RegexNode, string | string[]>(
    {
        kind: "regex",
        parse: (input) => listFrom(input).sort(),
        compile: (rule, s) =>
            rule
                .map((source) =>
                    s.check("regex", source, `${s.data}.match(/${source}/)`)
                )
                .join("\n"),
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
