import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("regex", () => {
    const regex = model(/.*@redo\.dev/)
    it("type", () => {
        assert(regex.type).typed as string
    })
    it("generation", () => {
        assert(() => regex.generate()).throws.snap(
            `TypeError: Generation of regular expressions is not supported.`
        )
    })
    it("validation", () => {
        assert(regex.validate("david@redo.dev").error).is(undefined)
        assert(regex.validate("david@redo.qa").error).snap(
            `'david@redo.qa' does not match expression /.*@redo\\.dev/.`
        )
        assert(regex.validate({ inObject: "david@redo.dev" }).error).snap(
            `Non-string value {inObject: 'david@redo.dev'} cannot satisfy regex definitions.`
        )
    })
})
