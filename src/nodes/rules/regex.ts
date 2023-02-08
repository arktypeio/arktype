import type { TraversalCheck } from "../../traverse/traverse.ts"
import type { CollapsibleList } from "../../utils/generics.ts"
import { composeIntersection } from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"

const regexCache: Record<string, RegExp> = {}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const checkRegex = ((data, source, state) => {
    if (!getRegex(source).test(data)) {
        state.problems.add(
            "regex",
            data,
            state.path.length === 0 && state.type.name !== "type"
                ? state.type.name
                : `/${source}/`
        )
    }
    return data
}) satisfies TraversalCheck<"regex">

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)
