import type { EntryChecker } from "../../traverse/traverse.js"
import type { constructor } from "../../utils/generics.js"
import { objectKindOf } from "../../utils/objectKinds.js"
import { composeIntersection, equality } from "../compose.js"

export const classIntersection = composeIntersection<constructor>(
    (l, r, state) => {
        return l === r
            ? equality()
            : l instanceof r
            ? l
            : r instanceof l
            ? r
            : state.addDisjoint("class", l, r)
    }
)

export const checkClass: EntryChecker<"class"> = (expectedClass, state) => {
    if (typeof expectedClass === "string") {
        return (
            objectKindOf(state.data) === expectedClass ||
            !state.problems.add("class", expectedClass)
        )
    }
    return (
        state.data instanceof expectedClass ||
        !state.problems.add("class", expectedClass)
    )
}
