import { assert } from "@re-/assert"
import { model } from "#api"

describe("root definition", () => {
    it("bad type def type", () => {
        // @ts-expect-error
        assert(() => model({ bad: Symbol() }))
            .throws.snap()
            .type.errors.snap()
        // @ts-expect-error
        assert(() => model({ bad: () => ({}) }))
            .throws.snap()
            .type.errors.snap()
    })
})
