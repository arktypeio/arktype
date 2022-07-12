import { assert } from "@re-/assert"
import { model } from "../../src/model.js"

describe("str", () => {
    it("errors on empty string", () => {
        // @ts-expect-error
        assert(() => model(""))
            .throws.snap(`Error: Unable to determine the type of ''.`)
            .type.errors.snap(
                `Argument of type '""' is not assignable to parameter of type '"Expected an expression."'.`
            )
    })
    it("ignores whitespace", () => {
        const modelWithWhitespace = model("     string  | boolean    []   ")
        assert(modelWithWhitespace.type).typed as string | boolean[]
    })
})
