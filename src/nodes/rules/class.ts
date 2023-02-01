import type { TraversalCheck } from "../../traverse/check.ts"
import type { defineProblem } from "../../traverse/problems.ts"
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

export type ClassProblemContext = defineProblem<{
    code: "class"
    data: unknown
    expected: string
    actual: string
}>

export const checkClass = ((data, expectedClass, state) => {
    if (!(data instanceof expectedClass)) {
        const expected = expectedClass.name
        const actual = (data as Object).constructor.name
        state.addProblem({
            code: "class",
            data,
            expected,
            actual,
            description: `a subclass of ${expected}`
        })
    }
}) satisfies TraversalCheck<"class">
