import type { EntryChecker } from "../../traverse/traverse.ts"
import type { constructor } from "../../utils/generics.ts"
import type { DefaultObjectKind } from "../../utils/objectKinds.ts"
import { defaultObjectKinds, objectKindOf } from "../../utils/objectKinds.ts"
import { composeIntersection, equality } from "../compose.ts"

export const classIntersection = composeIntersection<
    constructor | DefaultObjectKind
>((l, r, state) => {
    const lClass = typeof l === "string" ? defaultObjectKinds[l] : l
    const rClass = typeof r === "string" ? defaultObjectKinds[r] : r
    return lClass === rClass
        ? equality()
        : lClass instanceof rClass
        ? l
        : rClass instanceof lClass
        ? r
        : state.addDisjoint("class", l, r)
})

export const checkClass: EntryChecker<"class"> = (expectedClass, state) => {
    if (typeof expectedClass === "string") {
        return (
            objectKindOf(state.data) === expectedClass ||
            state.problems.add("class", state.data, expectedClass)
        )
    }
    return (
        state.data instanceof expectedClass ||
        state.problems.add("class", state.data, expectedClass)
    )
}
