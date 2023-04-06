import type { EntryChecker } from "../../traverse/traverse.js"
import type { CollapsibleList } from "../../utils/generics.js"
import { composeIntersection } from "../compose.js"
import { collapsibleListUnion } from "./collapsibleSet.js"

const regexCache: Record<string, RegExp> = {}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const checkRegex: EntryChecker<"regex"> = (source, state) =>
    getRegex(source).test(state.data) ||
    !state.problems.add("regex", `/${source}/`)

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)
