import type { CollapsibleList } from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { Compiler } from "../compile.ts"
import { composeIntersection } from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"

const regexCache: Record<string, RegExp> = {}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const compileRegexLines = (rule: CollapsibleList<string>, c: Compiler) =>
    listFrom(rule).map(
        (source) =>
            `/${source}/.test(${c.data}) || ${c.problem(
                "regex",
                "`" + source + "`"
            )}` as const
    )

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)
