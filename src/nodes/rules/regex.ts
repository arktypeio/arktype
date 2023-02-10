import type { EntryChecker } from "../../traverse/traverse.ts"
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

export const checkRegex: EntryChecker<"regex"> = (source, state) =>
    getRegex(source).test(state.data) ||
    state.problems.create("regex", `/${source}/`)

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)
