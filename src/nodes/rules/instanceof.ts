import type { TraversalCheck } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageBuilder
} from "../../traverse/problems.ts"
import type { classOf } from "../../utils/generics.ts"
import { composeIntersection, empty, equal } from "../compose.ts"

export const instanceofIntersection = composeIntersection<classOf<unknown>>(
    (l, r) =>
        l === r ? equal : l instanceof r ? l : r instanceof l ? r : empty
)

export type InstanceOfErrorContext = defineProblem<
    unknown,
    {
        expected: string
        actual: string
    }
>

export const buildInstanceOfError: ProblemMessageBuilder<"instanceof"> = ({
    actual,
    expected
}) => `Must be an instance of ${expected} (got ${actual})`

export const checkInstanceOf = ((state, expectedClass) => {
    if (!(state.data instanceof expectedClass)) {
        state.problems.addProblem(
            "instanceof",
            {
                expected: expectedClass.name,
                actual: (state.data as Object).constructor.name
            },
            state
        )
    }
}) satisfies TraversalCheck<"instanceof">
