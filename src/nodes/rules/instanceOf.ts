import type { constructor } from "../../utils/generics.ts"
import {
    getExactConstructorObjectKind,
    objectKindDescriptions
} from "../../utils/objectKinds.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"
import { defineProblemConfig } from "../problems.ts"
import { registerConstructor } from "../registry.ts"

export const instanceOfIntersection = composeIntersection<constructor>(
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

export const instanceOfCompilation = (
    instanceOf: constructor,
    c: Compilation
) => {
    if (instanceOf === Array) {
        return c.check("instanceOf", `Array.isArray(data)`, Array)
    }
    return c.check(
        "instanceOf",
        `data instanceof ${registerConstructor(instanceOf.name, instanceOf)}`,
        instanceOf
    )
}

export const instanceOfProblemConfig = defineProblemConfig("instanceOf", {
    mustBe: (instanceOf) => {
        const possibleObjectKind = getExactConstructorObjectKind(instanceOf)
        return possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${instanceOf.name}`
    },
    was: ({ className }) => className
})
