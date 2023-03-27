import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"
import { registerRegex } from "../registry.ts"
import { listUnion } from "./collapsibleSet.ts"
import { RuleNode } from "./rule.ts"

export class RegexNode extends RuleNode<"regex", string[]> {
    readonly kind = "regex"

    compare(rule: string[], s: ComparisonState): Comparison<string[]> {
        const intersection = listUnion(this.rule, rule)
        return this.rule.length === intersection.length
            ? rule.length === intersection.length
                ? s.equality(intersection)
                : s.subtype(this.rule)
            : rule.length === intersection.length
            ? s.supertype(rule)
            : s.overlap(intersection)
    }

    compile(c: Compilation): string {
        return this.rule
            .map(
                (source) =>
                    `${registerRegex(source)}.test(${c.data}) || ${c.problem(
                        "regex",
                        "`" + source + "`"
                    )}` as const
            )
            .join(";")
    }
}
