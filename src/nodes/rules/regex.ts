import type { CollapsibleList } from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { Intersection, Intersection } from "../compose.ts"
import { registerRegex } from "../registry.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import type { RuleNode } from "./rule.ts"

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)

export const compileRegex = (rule: CollapsibleList<string>, c: Compilation) =>
    listFrom(rule)
        .map(
            (source) =>
                `${registerRegex(source)}.test(${c.data}) || ${c.problem(
                    "regex",
                    "`" + source + "`"
                )}` as const
        )
        .join(";")

export class RegexNode implements RuleNode<RegexNode> {
    constructor(public rule: string[]) {}

    compare(r: RegexNode, s: Intersection): Intersection<RegexNode> {}
}
