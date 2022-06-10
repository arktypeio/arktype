import { assert } from "@re-/assert"
import { eager } from "#api"

describe("root definition", () => {
    it("bad type def type", () => {
        // @ts-expect-error
        assert(() => eager({ bad: Symbol() }))
            .throws.snap(
                `Type 'symbol' is not assignable to type '"Error: Values of type 'function' or 'symbol' are not valid definitions."'.`
            )
            .type.errors.snap()
        // @ts-expect-error
        assert(() => eager({ bad: () => ({}) }))
            .throws.snap(
                `Type '() => {}' is not assignable to type '"Error: Values of type 'function' or 'symbol' are not valid definitions."'.`
            )
            .type.errors.snap()
    })
})
