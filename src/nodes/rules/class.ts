import type { EntryTraversal } from "../../traverse/traverse.ts"
import type { constructor } from "../../utils/generics.ts"
import { composeIntersection, equality } from "../compose.ts"

export const classIntersection = composeIntersection<constructor>(
    (l, r, state) =>
        l === r
            ? equality()
            : l instanceof r
            ? l
            : r instanceof l
            ? r
            : state.addDisjoint("class", l, r)
)

export const checkClass: EntryTraversal<"class"> = (
    data,
    expectedClass,
    state
) =>
    data instanceof expectedClass
        ? data
        : state.problems.add("class", data, expectedClass)
