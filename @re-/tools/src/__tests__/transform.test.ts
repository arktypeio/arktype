import { assert } from "@re-/assert"
import { test } from "mocha"
import { EntryMapper, transform } from "../index.js"

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

test("objects", () => {
    assert(transform(o, ([k, v]) => [k.toUpperCase(), -v])).equals({
        A: -1,
        B: -2,
        C: -3
    })
})
test("value type change", () => {
    const result: { [k: number]: string } = transform(o, ([k, v]) => [v, k])
    assert(result).equals({
        1: "a",
        2: "b",
        3: "c"
    })
})
test("deep", () => {
    const result = transform(deepO, mapLeavesToPaths, { deep: true })
    assert(result).equals(pathsOfDeepO)
})
test("recurseWhen", () => {
    const result = transform(deepO, mapLeavesToPaths, {
        deep: true,
        recurseWhen: ([k], { path }) => k === "b" && path.includes("b")
    })
    assert(result).equals({ a: o, b: pathsOfDeepO.b })
})
test("filter null from map results", () => {
    const result = transform(deepO, ([k, v]) => (k === "a" ? null : [k, v]), {
        deep: true
    })
    assert(result).value.equals({ b: { b: 2, c: 3 } })
})
test("errors on non-objects", () => {
    assert(() => transform(null as any, (_) => _)).throws()
    assert(() => transform(undefined as any, (_) => _)).throws()
    assert(() => transform(true as any, (_) => _)).throws()
})
test("infer array", () => {
    const inferredAsArrayResult = transform([true, false], ([i, v]) => [i, !v])
    assert(inferredAsArrayResult).equals([false, true]).typed as boolean[]
})
test("explicitly infer array", () => {
    const specifiedInferArrayResult = transform(
        [true, false],
        ([i, v]) => [i, !v],
        { asArray: "infer" }
    )
    assert(specifiedInferArrayResult).equals([false, true]).typed as boolean[]
})
test("force record", () => {
    const specifiedAsArrayResult = transform(
        [true, false],
        ([i, v]) => [i, !v],
        {
            asArray: "never"
        }
    )
    assert(specifiedAsArrayResult).equals({ 0: false, 1: true }).typed as {
        [x: number]: boolean
    }
})
test("force array", () => {
    const result = transform({ a: 3.14, b: 159 }, ([k, v]) => [k, `${v}`], {
        asArray: "always"
    })
    assert(result).equals(["3.14", "159"]).typed as string[]
})
