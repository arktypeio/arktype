import { transform } from "../common"

const o = {
    a: 1,
    b: 2,
    c: 3
}

describe("transform", () => {
    test("transforms objects", () => {
        expect(transform(o, ([k, v]) => [k.toUpperCase(), -v])).toStrictEqual({
            A: -1,
            B: -2,
            C: -3
        })
    })
    test("errors on invalid objects", () => {
        expect(() => transform(null, _ => _)).toThrow()
        expect(() => transform(undefined, _ => _)).toThrow()
        expect(() => transform(true, _ => _)).toThrow()
    })
})
