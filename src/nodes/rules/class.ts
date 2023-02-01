import type { TraversalCheck } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageWriter
} from "../../traverse/problems.ts"
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

export const writeClassProblem: ProblemMessageWriter<"class"> = ({
    actual,
    expected
}) => ({
    must: `extend ${expected}`,
    was: actual
})

export const checkClass = ((data, expectedClass, state) => {
    if (!(data instanceof expectedClass)) {
        state.addProblem({
            code: "class",
            data,
            expected: expectedClass.name,
            actual: (data as Object).constructor.name
        })
    }
}) satisfies TraversalCheck<"class">
