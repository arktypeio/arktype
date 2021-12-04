import { assert } from ".."

const n: number = 5
const o = { re: "do" }
const shouldThrow = (a: false) => {
    if (a) {
        throw new Error("true is not assignable to false")
    }
}
const throwError = () => {
    throw new Error("Test error.")
}

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
    test("returns", () => {
        assert(() => null).returns(null).typed as null
        expect(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns("hi!").typed as number
        ).toThrow(/number[\s\S]*string/g)
        expect(() =>
            assert((input: string) => `${input}!`)
                .args("hi")
                .returns.type.toString()
                .is("number")
        ).toThrow(/number[\s\S]*string/g)
    })
    test("args", () => {
        assert((input: string) => `${input}!`)
            .args("omg")
            .returns()
            .is("omg!")
        expect(() =>
            assert((input: string) => {
                throw new Error(`${input}!`)
            })
                .args("fail")
                .throws("omg!")
        ).toThrow("fail")
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
    test("snap", () => {
        // You can delete the snapshot and it will be re-generated,
        // but not going to bother to write a test for that yet
        // since it's just calling jest's snapshot functionality
        assert(o).snap(`
            {
              "re": "do",
            }
        `)
        assert(o).equals({ re: "do" }).type.toString.snap(`"{ re: string; }"`)
        assert(o).snap.toFile()
    })
    test("hasTypedValue", () => {
        const getDo = () => "do"
        assert(o).hasTypedValue({ re: getDo() })
        expect(() => assert(o).hasTypedValue({ re: "do" as any })).toThrow(
            "any"
        )
        expect(() => assert(o).hasTypedValue({ re: "don't" })).toThrow("don't")
    })
    test("return has typed value", () => {
        assert(() => "ooo").returns.hasTypedValue("ooo")
        // Wrong value
        expect(() =>
            assert((input: string) => input)
                .args("yes")
                .returns.hasTypedValue("whoop")
        ).toThrow("whoop")
        // Wrong type
        expect(() =>
            assert((input: string) => input)
                .args("yes")
                .returns.hasTypedValue("yes" as unknown)
        ).toThrow("unknown")
    })
    test("throwsAndHasTypeError", () => {
        assert(() => shouldThrow(true)).throwsAndHasTypeError(
            /.*true.*not assignable.*false.*/g
        )
        // No thrown error
        expect(() =>
            assert(() => shouldThrow(null)).throwsAndHasTypeError(
                "not assignable"
            )
        ).toThrow("didn't throw")
        // No type error
        expect(() =>
            assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
                "not assignable"
            )
        ).toThrow(/.*Received.*""/g)
    })
})
