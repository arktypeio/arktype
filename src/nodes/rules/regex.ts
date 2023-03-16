import type { CollapsibleList } from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection } from "../compose.ts"
import { defineProblemConfig } from "../problems.ts"
import { registerRegex } from "../registry.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)

export const regexProblemConfig = defineProblemConfig("regex", {
    mustBe: (source) => `a string matching /${source}/`
})

export const regexCompilation = (
    rule: CollapsibleList<string>,
    c: Compilation
) =>
    listFrom(rule).map(
        (source) =>
            `${registerRegex(source)}.test(${c.data}) || ${c.problem(
                "regex",
                "`" + source + "`"
            )}` as const
    )
