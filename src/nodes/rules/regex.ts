import type { Compilation } from "../compile.ts"
import { registerRegex } from "../registry.ts"
import { SetRule } from "./rule.ts"

export class RegexNode extends SetRule<"regex", string> {
    readonly kind = "regex"

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
