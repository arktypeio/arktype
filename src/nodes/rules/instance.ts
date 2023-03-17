import type { constructor } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"
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
        return c.check("instance", `Array.isArray(${c.data})`, Array)
    }
    return c.check(
        "instance",
        `${c.data} instanceof ${registerConstructor(
            instanceOf.name,
            instanceOf
        )}`,
        instanceOf
    )
}
