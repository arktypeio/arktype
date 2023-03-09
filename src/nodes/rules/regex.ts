import type { CollapsibleList } from "../../utils/generics.ts"
import { composeIntersection } from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import type { RuleCompiler } from "./rules.ts"

const regexCache: Record<string, RegExp> = {}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const checkRegex: RuleCompiler<string> = (source, state) =>
    `/${source}/.test(data) || ${state.precompileProblem(
        "regex",
        source
    )}` as const

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)
