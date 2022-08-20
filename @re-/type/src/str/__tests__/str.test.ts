import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../type.js"

describe("str", () => {
    test("errors on empty string", () => {
        // @ts-expect-error
        assert(() => type(""))
            .throws.snap(`Error: Unable to determine the type of ''.`)
            .type.errors.snap(
                `Argument of type '""' is not assignable to parameter of type '"Expected an expression."'.`
            )
    })
    test("ignores whitespace between identifiers/operators", () => {
        const modelWithWhitespace = type("     string  | boolean    []   ")
        assert(modelWithWhitespace.infer).typed as string | boolean[]
    })
    test("errors on bad whitespace", () => {
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
