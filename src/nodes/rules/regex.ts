import type { Compilation } from "../node.ts"
import { registerRegex } from "../registry.ts"
import { intersectUniqueLists, Rule } from "./rule.ts"

export class RegexRule extends Rule<"regex"> {
    constructor(public sources: string[]) {
        super(
            "regex",
            JSON.stringify(sources.length === 1 ? sources[0] : sources.sort())
        )
    }

    intersect(other: RegexRule) {
        return new RegexRule(intersectUniqueLists(this.sources, other.sources))
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
