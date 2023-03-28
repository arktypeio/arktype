import type { Compilation } from "../compile.ts"
import type { ComparisonState } from "../compose.ts"
import { DisjointContext } from "../compose.ts"
import { registerRegex } from "../registry.ts"
import { intersectUniqueLists, RuleNode } from "./rule.ts"

export class RegexNode extends RuleNode<"regex", readonly string[]> {
    readonly kind = "regex"

    intersectRule(other: readonly string[]) {
        return intersectUniqueLists(this.rule, other)
    }

    compile(c: Compilation): string {
        return [...this.rule]
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
