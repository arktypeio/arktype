import type { TraversalCheck } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageWriter
} from "../../traverse/problems.ts"
import type { constructor } from "../../utils/generics.ts"
import { addEmpty, composeIntersection, equal } from "../compose.ts"

export const classIntersection = composeIntersection<constructor>(
    (l, r, context) =>
        l === r
            ? equal
            : l instanceof r
            ? l
            : r instanceof l
            ? r
            : addEmpty("class", l, r, context)
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
