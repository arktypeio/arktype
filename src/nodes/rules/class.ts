import type { TraversalCheck } from "../../traverse/check.ts"
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

export const checkClass = ((data, expectedClass, state) => {
    if (!(data instanceof expectedClass)) {
        state.problem("class", { class: expectedClass, data })
    }
}) satisfies TraversalCheck<"class">
