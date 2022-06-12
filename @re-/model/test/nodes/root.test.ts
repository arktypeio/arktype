import { assert } from "@re-/assert"
import { eager } from "#src"

describe("root definition", () => {
    it("bad type def type", () => {
        // @ts-expect-error
        assert(() => eager({ bad: Symbol() }))
            .throws.snap(
                `Error: Definition Symbol() at path bad is of disallowed type symbol.`
            )
            .type.errors.snap(
                `Type 'symbol' is not assignable to type '"Error: Values of type 'function' or 'symbol' are not valid definitions."'.`
            )
        // @ts-expect-error
        assert(() => eager({ bad: () => ({}) }))
            .throws.snap(
                `Error: Definition ()=>({}) at path bad is of disallowed type function.`
            )
            .type.errors.snap(
                `Type '() => {}' is not assignable to type '"Error: Values of type 'function' or 'symbol' are not valid definitions."'.`
            )
    })
})
