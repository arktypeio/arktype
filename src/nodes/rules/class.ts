import type { constructor } from "../../utils/generics.ts"
import { objectKindOf } from "../../utils/objectKinds.ts"
import type { Compiler } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"

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

export const compileClassCheck = (expected: constructor, c: Compiler) =>
    `data instanceof expected` as const

// return (
//     state.data instanceof expectedClass ||
//     !state.problems.add("class", expectedClass)
// )
