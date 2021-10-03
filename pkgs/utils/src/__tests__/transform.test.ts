import { expectType } from "tsd"
import { transform } from ".."

const o = {
    a: 1,
    b: 2,
    c: 3
}

describe("transform", () => {
    test("objects", () => {
        expect(transform(o, ([k, v]) => [k.toUpperCase(), -v])).toStrictEqual({
            A: -1,
            B: -2,
            C: -3
        })
    })
    test("value type change", () => {
        const result: { [k: number]: string } = transform(o, ([k, v]) => [v, k])
        expect(result).toStrictEqual({
            1: "a",
            2: "b",
            3: "c"
        })
    })
    test("errors on invalid objects", () => {
        expect(() => transform(null as any, (_) => _)).toThrow()
        expect(() => transform(undefined as any, (_) => _)).toThrow()
        expect(() => transform(true as any, (_) => _)).toThrow()
    })
    test("as array", () => {
        const a = [true, false]
        const inferredAsArrayResult = transform(a, ([i, v]) => [i, !v])
        expectType<boolean[]>(inferredAsArrayResult)
        expect(inferredAsArrayResult).toStrictEqual([false, true])
        const specifiedAsArrayResult = transform(a, ([i, v]) => [i, !v], {
            asValueArray: false
        })
        expectType<Record<number, boolean>>(specifiedAsArrayResult)
        expect(specifiedAsArrayResult).toStrictEqual({ 0: false, 1: true })
        const specifiedValueArrayResult = transform(
            { a: 3.14, b: 159 },
            ([k, v]) => [k, `${v}`],
            { asValueArray: true }
        )
        expectType<string[]>(specifiedValueArrayResult)
        expect(specifiedValueArrayResult).toStrictEqual(["3.14", "159"])
    })
})
