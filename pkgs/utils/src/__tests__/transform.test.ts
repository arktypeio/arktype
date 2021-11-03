import { expectType } from "tsd"
import { EntryMapper, transform } from ".."

const o = {
    a: 1,
    b: 2,
    c: 3
}

const deepO = {
    a: o,
    b: o
}

const pathsOfDeepO = {
    a: {
        a: ["a", "a"],
        b: ["a", "b"],
        c: ["a", "c"]
    },
    b: {
        a: ["b", "a"],
        b: ["b", "b"],
        c: ["b", "c"]
    }
}

const mapLeavesToPaths: EntryMapper<any, any> = ([k, v], { path }) => [
    k,
    path.length === 2 ? path : v
]

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
    test("deep", () => {
        const result = transform(deepO, mapLeavesToPaths, { deep: true })
        expect(result).toStrictEqual(pathsOfDeepO)
    })
    test("recurseWhen", () => {
        const result = transform(deepO, mapLeavesToPaths, {
            deep: true,
            recurseWhen: ([k, v], { path }) => k === "b" && path.includes("b")
        })
        expect(result).toStrictEqual({ a: o, b: pathsOfDeepO.b })
    })
    test("filter null from map results", () => {
        const result = transform(
            deepO,
            ([k, v]) => (k === "a" ? null : [k, v]),
            {
                deep: true
            }
        )
        expect(result).toStrictEqual({ b: { b: 2, c: 3 } })
    })
    test("errors on invalid objects", () => {
        expect(() => transform(null as any, (_) => _)).toThrow()
        expect(() => transform(undefined as any, (_) => _)).toThrow()
        expect(() => transform(true as any, (_) => _)).toThrow()
    })
    test("infer array", () => {
        const inferredAsArrayResult = transform([true, false], ([i, v]) => [
            i,
            !v
        ])
        expectType<boolean[]>(inferredAsArrayResult)
        expect(inferredAsArrayResult).toStrictEqual([false, true])
    })
    test("explicitly infer array", () => {
        const specifiedInferArrayResult = transform(
            [true, false],
            ([i, v]) => [i, !v],
            { asArray: "infer" }
        )
        expectType<boolean[]>(specifiedInferArrayResult)
        expect(specifiedInferArrayResult).toStrictEqual([false, true])
    })
    test("force record", () => {
        const specifiedAsArrayResult = transform(
            [true, false],
            ([i, v]) => [i, !v],
            {
                asArray: "never"
            }
        )
        expectType<Record<number, boolean>>(specifiedAsArrayResult)
        expect(specifiedAsArrayResult).toStrictEqual({ 0: false, 1: true })
    })
    test("force array", () => {
        const result = transform({ a: 3.14, b: 159 }, ([k, v]) => [k, `${v}`], {
            asArray: "always"
        })
        expectType<string[]>(result)
        expect(result).toStrictEqual(["3.14", "159"])
    })
})
