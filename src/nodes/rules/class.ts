import type { TraversalCheck } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageWriter
} from "../../traverse/problems.ts"
import type { classOf } from "../../utils/generics.ts"
import { composeIntersection, empty, equal } from "../compose.ts"

export const classIntersection = composeIntersection<classOf<unknown>>((l, r) =>
    l === r ? equal : l instanceof r ? l : r instanceof l ? r : empty
)

export type ClassProblemContext = defineProblem<
    unknown,
    {
        expected: string
        actual: string
    }
>

export const writeClassProblem: ProblemMessageWriter<"class"> = ({
    actual,
    expected
}) => `Must be an instance of ${expected} (was ${actual})`

export const checkClass = ((state, expectedClass) => {
    if (!(state.data instanceof expectedClass)) {
        state.problems.addProblem(
            "class",
            {
                expected: expectedClass.name,
                actual: (state.data as Object).constructor.name
            },
            state
        )
    }
}) satisfies TraversalCheck<"class">
