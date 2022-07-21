import { assert } from "@re-/assert"
import { type } from "../../src/model.js"

describe("str", () => {
    it("errors on empty string", () => {
        // @ts-expect-error
        assert(() => type(""))
            .throws.snap(`Error: Unable to determine the type of ''.`)
            .type.errors.snap(
                `Argument of type '""' is not assignable to parameter of type '"Expected an expression."'.`
            )
    })
    it("ignores whitespace between identifiers/operators", () => {
        const modelWithWhitespace = type("     string  | boolean    []   ")
        assert(modelWithWhitespace.type).typed as string | boolean[]
    })
    it("errors on bad whitespace", () => {
        assert(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        ).throwsAndHasTypeError("Expected an operator (got l).")
        // @ts-expect-error
        assert(() => type("string | boolean[ ]")).throwsAndHasTypeError(
            "Missing expected ']'."
        )
    })
})
