import { assert } from ".."

const n: number = 5
const o = { re: "do" }
const shouldThrow = (a: boolean) => {
    if (a) {
        throw new Error()
    }
}
const throwError = () => {
    throw new Error("Test error.")
}

// const dofsh = 500

// assert(dofsh).is(500)
// assert(dofsh).hasTypedValue(500 as number)
// assert({}).equals(500).typed as number
// assert(() => () => ({})).returns.returns({})
// assert((s: number) => "").args(5)
// assert(dofsh).typed as number
// assert(dofsh).type.errors([])
// assert(dofsh).type.toString("number")
// assert(dofsh).type.toString.snap()
// assert(dofsh).type.toString("")

describe("assert", () => {
    test("type toString", () => {
        assert(o).type.toString("{ re: string; }")
        assert(o).type.toString().is("{ re: string; }")
        assert(o).type.toString.is("{ re: string; }")
    })
    test("typed", () => {
        assert(o).typed as { re: string }
    })
    test("badTyped", () => {
        expect(() => assert(o).typed as { re: number }).toThrowError("number")
    })
    test("equals", () => {
        assert(o).equals({ re: "do" })
    })
    test("bad equals", () => {
        expect(() => assert(o).equals({ re: "doo" })).toThrow("doo")
    })
    test("valid type errors", () => {
        assert(o).type.errors("")
        assert(() => shouldThrow(5, "")).type.errors.is(
            "Expected 1 arguments, but got 2."
        )
    })
    test("bad type errors", () => {
        expect(() => assert(o).type.errors("This error doesn't exist")).toThrow(
            "doesn't exist"
        )
        expect(() =>
            assert(() => shouldThrow("this is a type error")).type.errors.is("")
        ).toThrow("not assignable")
    })
    test("chainable", () => {
        assert(o).equals({ re: "do" }).typed as { re: string }
        assert(() => throwError("this is a type error"))
            .throws("Test error.")
            .type.errors("Expected 0 arguments, but got 1.")
    })
    test("bad chainable", () => {
        expect(() =>
            assert(n)
                .equals(5)
                .type.errors.equals("Expecting an error here will throw")
        ).toThrow("Expecting an error")
        expect(() => assert(n).is(7).type.toString("string")).toThrow("7")
        expect(
            () => assert(() => {}).returns.is(undefined).typed as () => null
        ).toThrow("null")
    })
})
