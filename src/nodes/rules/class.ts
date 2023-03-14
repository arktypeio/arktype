import { getCompiledGlobal, globals } from "../../traverse/globals.ts"
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
    let key = constructor.name
    let suffix = 2
    while (
        key in globals.constructors &&
        globals.constructors[key] !== constructor
    ) {
        key = `${constructor.name}${suffix++}`
    }
    globals.constructors[key] = constructor
    return c.check(
        "constructor",
        `data instanceof ${getCompiledGlobal("constructors", key)}`,
        constructor
    )
}
