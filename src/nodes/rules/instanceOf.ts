import type { constructor } from "../../utils/generics.ts"
import {
    getExactConstructorObjectKind,
    objectKindDescriptions
} from "../../utils/objectKinds.ts"
import type { Path } from "../../utils/paths.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"
import { defineProblemConfig, Problem } from "../problems.ts"
import { registerConstructor } from "../registry.ts"

export const intersectInstanceOf = composeIntersection<constructor>(
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

export const compileInstanceOf = (instanceOf: constructor, c: Compilation) => {
    if (instanceOf === Array) {
        return c.check("instanceOf", `Array.isArray(data)`, Array)
    }
    return c.check(
        "instanceOf",
        `data instanceof ${registerConstructor(instanceOf.name, instanceOf)}`,
        instanceOf
    )
}

export class InstanceOfProblem extends Problem<object> {
    constructor(public instanceOf: constructor, data: object, path: Path) {
        super("instanceOf", data, path)
    }

    get mustBe() {
        const possibleObjectKind = getExactConstructorObjectKind(
            this.instanceOf
        )
        return possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${this.instanceOf.name}`
    }
}
