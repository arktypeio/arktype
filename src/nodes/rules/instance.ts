import type { constructor } from "../../utils/generics.ts"
import {
    getExactConstructorObjectKind,
    objectKindDescriptions
} from "../../utils/objectKinds.ts"
import type { Path } from "../../utils/paths.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"
import { Problem } from "../problems.ts"
import { registerConstructor } from "../registry.ts"

export const instanceIntersection = composeIntersection<constructor>(
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

export const compileInstance = (instanceOf: constructor, c: Compilation) => {
    if (instanceOf === Array) {
        return c.check("instance", `Array.isArray(data)`, Array)
    }
    return c.check(
        "instance",
        `data instanceof ${registerConstructor(instanceOf.name, instanceOf)}`,
        instanceOf
    )
}

export class InstanceProblem extends Problem<constructor, object> {
    readonly code = "instance"

    get mustBe() {
        const possibleObjectKind = getExactConstructorObjectKind(
            this.requirement
        )
        return possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${this.requirement.name}`
    }
}
