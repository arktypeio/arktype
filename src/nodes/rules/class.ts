import { compileRegistered } from "../../traverse/store.ts"
import type { constructor } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"

export const classIntersection = composeIntersection<constructor>(
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

export const compileClassCheck = (constructor: constructor, c: Compilation) => {
    if (constructor === Array) {
        return c.check("constructor", `Array.isArray(data)`, Array)
    }
    return c.check(
        "constructor",
        `data instanceof ${compileRegistered(
            "constructor",
            constructor.name,
            constructor
        )}`,
        constructor
    )
}
