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
describe("assert", () => {
    test("type", () => {
        assert(o).type("{re: string;}")
    })
    test("bad type", () => {
        expect(() => assert(o).type("{re: number;}")).toThrow("toBe")
    })
    test("value", () => {
        assert(o).value({ re: "do" })
    })
    test("bad value", () => {
        expect(() => assert(o).value({ re: 2 })).toThrow("toStrictEqual")
    })
    test("can use jest matchers", () => {
        assert(o).type().toMatch(/.*/)
        assert(o).value().toHaveProperty("re")
    })
    test("valid type errors", () => {
        assert(o).type.errors([])
        assert(() => shouldThrow(5, "")).type.errors().toMatchInlineSnapshot(`
            [
              "Expected 1 arguments, but got 2.",
            ]
        `)
    })
    test("bad type errors", () => {
        expect(() =>
            assert(o).type.errors(["This error doesn't exist"])
        ).toThrow("toStrictEqual")
        expect(() =>
            assert(() => shouldThrow("this is a type error")).type.errors([])
        ).toThrow("toStrictEqual")
    })
    test("chainable", () => {
        assert(o).type("{re: string;}").value({ re: "do" }).type.errors([])
        assert(throwError).type("() => never").value.throws("Test error.")
    })
    test("bad chainable", () => {
        // Default prettier formatting breaks source map here, don't really want to dig into that
        // (seems like first assert prop has to be accessed immediately?)
        expect(() =>
            // prettier-ignore
            assert(n).value(5)
            .type("number")
            .type.errors(["Expecting an error here will throw"])
        ).toThrow("toStrictEqual")
        expect(() =>
            // prettier-ignore
            assert(n).type("string")
                .value()
                .toMatchInlineSnapshot("We should never get here")
        ).toThrow("toBe")
    })
})
