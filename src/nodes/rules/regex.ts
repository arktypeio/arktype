import type { CollapsibleList } from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { CompilationState } from "../compile.ts"
import { composeIntersection } from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"

const regexCache: Record<string, RegExp> = {}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const compileRegexLines = (
    rule: CollapsibleList<string>,
    state: CompilationState
) =>
    listFrom(rule).map(
        (source) =>
            `/${source}/.test(data) || ${state.precompileProblem(
                "regex",
                source
            )}` as const
    )

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)
