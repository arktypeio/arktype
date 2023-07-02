import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { compileCheck, InputParameterName } from "../../compile/compile.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
    `${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export interface RegexNode
    extends BaseNode<{ rule: SerializedRegexLiteral[] }> {}

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
    literal.slice(1, literal.lastIndexOf("/"))

export const regexNode = defineNodeKind<
    RegexNode,
    SerializedRegexLiteral | SerializedRegexLiteral[]
>(
    {
        kind: "regex",
        parse: (input) => listFrom(input).sort(),
        compile: (rule, ctx) =>
            rule
                .map((literal) =>
                    compileCheck(
                        "regex",
                        literal,
                        `${literal}.test(${InputParameterName})`,
                        ctx
                    )
                )
                .join("\n"),
        intersect: (l, r): RegexNode =>
            regexNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => ({
        description: `matched by ${base.rule.join(", ")}`
    })
)
