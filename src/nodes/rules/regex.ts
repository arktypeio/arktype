import type { Compilation } from "../node.ts"
import { registerRegex } from "../registry.ts"
import { intersectUniqueLists, Rule } from "./rule.ts"

export class RegexRule extends Rule<"regex"> {
    constructor(public definition: string[]) {
        super(
            "regex",
            JSON.stringify(
                definition.length === 1 ? definition[0] : definition.sort()
            )
        )
    }

    intersect(other: RegexRule) {
        return new RegexRule(
            intersectUniqueLists(this.definition, other.definition)
        )
    }

    compile(c: Compilation): string {
        return this.definition
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
