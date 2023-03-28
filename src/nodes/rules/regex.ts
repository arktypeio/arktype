import type { Compilation } from "../compile.ts"
import { registerRegex } from "../registry.ts"
import { intersectUniqueLists, RuleNode } from "./rule.ts"

export class RegexNode extends RuleNode<"regex"> {
    constructor(public sources: string[]) {
        super(
            "regex",
            JSON.stringify(sources.length === 1 ? sources[0] : sources.sort())
        )
    }

    intersect(other: RegexNode) {
        const intersection = intersectUniqueLists(this.sources, other.sources)
        return intersection.length === this.sources.length
            ? this
            : intersection.length === other.sources.length
            ? other
            : new RegexNode(intersection)
    }

    compile(c: Compilation): string {
        return this.sources
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
