import type { constructor } from "../../utils/generics.ts"
import { objectKindOf } from "../../utils/objectKinds.ts"
import { composeIntersection, equality } from "../compose.ts"
import type { RuleCompiler } from "./rules.ts"

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

export const compileClassCheck: RuleCompiler<constructor> = (expected, state) =>
    `data instanceof expected` as const

// return (
//     state.data instanceof expectedClass ||
//     !state.problems.add("class", expectedClass)
// )
