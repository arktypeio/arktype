import type { TraversalCheck, TraversalState } from "../../traverse/check.ts"
import type { ProblemDescriptionsWriter } from "../../traverse/problems.ts"
import { Problem } from "../../traverse/problems.ts"
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
        state.problems.add(new ClassProblem(expectedClass, state, data))
    }
}) satisfies TraversalCheck<"class">

export type ClassProblemContext = {
    class: constructor
    data: object
}

export const describeClassProblem: ProblemDescriptionsWriter<"class"> = (
    input
) => ({
    mustBe: `an instance of ${input.class.name}`,
    was: input.data.className
})
