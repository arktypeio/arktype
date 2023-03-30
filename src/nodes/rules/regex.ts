import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { registerRegex } from "../registry.ts"
import { intersectUniqueLists } from "./rule.ts"

export class RegexRule extends Node<RegexRule, string[]> {
    serialize() {
        return JSON.stringify(
            this.definition.length === 1
                ? this.definition[0]
                : this.definition.sort()
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
