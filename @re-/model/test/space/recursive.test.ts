import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("recursive models", () => {
    const definitions = { dejaVu: { dejaVu: "dejaVu?" } } as const
    it("type", () => {
        // Recursive type displays any but calculates just-in-time for each property access
        assert(space(definitions).meta.types.dejaVu.dejaVu?.dejaVu?.dejaVu)
            .typed as
            | {
                  dejaVu?: any
              }
            | undefined
    })
    it("validates shallow", () => {
        const recursive = space(definitions)
        assert(recursive.dejaVu.validate({ dejaVu: {} }).error).equals(
            undefined
        )
        assert(
            recursive.dejaVu.validate({
                dejaVu: { dejaVu: { jamaisVu: {} } }
            }).error?.paths
        ).snap({ "dejaVu/dejaVu": `Keys 'jamaisVu' were unexpected.` })
    })
    it("validates recursive", () => {
        const recursive = space(definitions)
        type DejaVu = typeof recursive.meta.types.dejaVu
        const dejaVu: DejaVu = {}
        dejaVu.dejaVu = dejaVu
        assert(recursive.dejaVu.validate(dejaVu).error).equals(undefined)
    })
})
