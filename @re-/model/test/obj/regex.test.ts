import { assert } from "@re-/assert"
import { model } from "../../src/index.js"

describe("regex", () => {
    const regex = model(/.*@redo\.dev/)
    it("type", () => {
        assert(regex.type).typed as string
    })
    it("generation", () => {
        assert(() => regex.create()).throws.snap(
            `Error: Unable to generate a value for '/.*@redo\\.dev/': Regex generation is unsupported.`
        )
    })
    it("validation", () => {
        assert(regex.validate("david@redo.dev").error).is(undefined)
        assert(regex.validate("david@redo.qa").error?.message).snap(
            `"david@redo.qa" does not match expression /.*@redo\\.dev/.`
        )
        assert(
            regex.validate({ inObject: "david@redo.dev" }).error?.message
        ).snap(
            `Non-string value {inObject: "david@redo.dev"} cannot satisfy regex definitions.`
        )
    })
})
