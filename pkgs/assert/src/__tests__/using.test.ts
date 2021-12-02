import { using } from ".."

const throwError = (hmm: never) => {
    throw new Error(hmm)
}
describe("using", () => {
    test("check", () => {
        expect(using(throwError).check.type()).toMatchInlineSnapshot(
            `"(hmm: never) => never"`
        )
    })
    test("assert", () => {
        using(() => throwError("yikes"))()
            .assert.value.throws("yikes")
            .type.errors([
                "Argument of type 'string' is not assignable to parameter of type 'never'."
            ])
        expect(() => using(5).assert.value(4)).toThrowError("toStrictEqual")
    })
})
