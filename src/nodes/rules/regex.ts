import type { CollapsibleList } from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { Path } from "../../utils/paths.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection } from "../compose.ts"
import { Problem } from "../problems.ts"
import { registerRegex } from "../registry.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)

export class RegexProblem extends Problem<string> {
    readonly code = "regex"

    get mustBe() {
        return `a string matching /${this.requirement}/`
    }
}

export const compileRegex = (rule: CollapsibleList<string>, c: Compilation) =>
    listFrom(rule).map(
        (source) =>
            `${registerRegex(source)}.test(${c.data}) || ${c.problem(
                "regex",
                "`" + source + "`"
            )}` as const
    )
