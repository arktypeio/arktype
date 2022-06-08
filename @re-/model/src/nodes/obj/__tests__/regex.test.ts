import { assert } from "@re-/assert"
import { lazily } from "@re-/tools"
import { model } from "#api"

describe("regex", () => {
    const regex = lazily(() => model(/.*@redo\.dev/))
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
            `'david@redo.qa' is not assignable to /.*@redo\\.dev/.`
        )
        assert(regex.validate({ inObject: "david@redo.dev" }).error).snap(
            `{inObject: 'david@redo.dev'} is not assignable to /.*@redo\\.dev/.`
        )
    })
})
