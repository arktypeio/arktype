import { strict } from "node:assert"
import { DeepEqualAssertionError } from "@re-/tools"
import { assert } from "../src/assert.js"

const o = { re: "do" }
const shouldThrow = (a: false) => {
    if (a) {
        throw new Error(`${a} is not assignable to false`)
    }
}
const throwError = () => {
    throw new Error("Test error.")
}
describe("Assertions for Inline Snapshots", () => {
    it("default serializer doesn't care about prop order", () => {
        const actual = { a: true, b: false }
        assert(actual).snap({ b: false, a: true })
    })
    it("snap", () => {
        assert(o).snap({ re: `do` })
        assert(o).equals({ re: "do" }).type.toString.snap(`{ re: string; }`)
        strict.throws(
            () => assert(o).snap({ re: `dorf` }),
            DeepEqualAssertionError,
            "dorf"
        )
    })
    it("value and type snap", () => {
        assert(o).snap({ re: `do` }).type.toString.snap(`{ re: string; }`)
        strict.throws(
            () =>
                assert(o)
                    .snap({ re: `do` })
                    .type.toString.snap(`{ re: number; }`),
            strict.AssertionError,
            "number"
        )
    })
    it("error and type error snap", () => {
        // @ts-expect-error
        assert(() => shouldThrow(true))
            .throws.snap(`Error: true is not assignable to false`)
            .type.errors.snap(
                `Argument of type 'true' is not assignable to parameter of type 'false'.`
            )
        strict.throws(
            () =>
                // @ts-expect-error
                assert(() => shouldThrow(1))
                    .throws.snap(`Error: 1 is not assignable to false`)
                    .type.errors.snap(
                        `Argument of type '2' is not assignable to parameter of type 'false'.`
                    ),
            strict.AssertionError,
            "'2'"
        )
    })
    it("throws", () => {
        assert(throwError).throws(/error/g)
        strict.throws(
            // Snap should never be populated
            () => assert(() => shouldThrow(false)).throws.snap(),
            strict.AssertionError,
            "didn't throw"
        )
    })
    /*
     * Some TS errors as formatted as diagnostic "chains"
     * We represent them by joining the parts of the message with newlines
     */
    it("TS diagnostic chain", () => {
        // @ts-expect-error
        assert(() => shouldThrow({} as {} | false)).type.errors.snap(
            `Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'.`
        )
    })
    it("multiple inline snaps", () => {
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
    })
})
