import type { TraversalCheck, TraversalState } from "../../traverse/check.ts"
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

export class ClassProblem extends Problem<"class", object> {
    actual: constructor

    constructor(
        public expected: constructor,
        state: TraversalState,
        data: object
    ) {
        super("class", state, data)
        this.actual = data.constructor as constructor
        this.was = this.actual.name
    }

    get mustBe() {
        return `an instance of ${this.expected.name}`
    }
}
