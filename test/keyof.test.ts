import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeImplicitNeverMessage } from "../src/parse/ast/intersection.ts"
import { keyOf } from "../src/scopes/standard.ts"
import { Path } from "../src/utils/paths.ts"

describe("keyof", () => {
    it("object literal", () => {
        const t = type(["keyof", { a: "123", b: "123" }])
        attest(t.infer).typed as "a" | "b"
        attest(t.node).snap({ string: [{ value: "a" }, { value: "b" }] })
    })
    it("overlapping union", () => {
        const t = type([
            "keyof",
            [{ a: "number", b: "boolean" }, "|", { b: "number", c: "string" }]
        ])
        attest(t.infer).typed as "b"
        attest(t.node).snap({ string: { value: "b" } })
    })
    const expectedNeverKeyOfMessage = writeImplicitNeverMessage(
        new Path() as [],
        "keyof"
    )
    it("non-overlapping union", () => {
        attest(() =>
            // @ts-expect-error
            type(["keyof", [{ a: "number" }, "|", { b: "number" }]])
        ).throwsAndHasTypeError(expectedNeverKeyOfMessage)
    })
    it("non-object", () => {
        const t = type(["keyof", "bigint"])
        attest(t.infer).typed as keyof bigint
        attest(t.node).snap({
            string: [
                { value: "constructor" },
                { value: "toLocaleString" },
                { value: "toString" },
                { value: "valueOf" }
            ],
            symbol: { value: "(symbol Symbol.toStringTag)" }
        })
    })
    it("union including non-object", () => {
        attest(() =>
            // @ts-expect-error
            type(["keyof", [{ a: "number" }, "|", "string"]])
        ).throwsAndHasTypeError(expectedNeverKeyOfMessage)
    })
    it("array", () => {
        const t = type(["keyof", ["string", "number"]])
        attest(t.infer).typed as keyof [string, number]
        attest(t.node).snap({
            string: [
                { value: "0" },
                { value: "1" },
                { value: "length" },
                { value: "constructor" },
                { value: "at" },
                { value: "concat" },
                { value: "copyWithin" },
                { value: "fill" },
                { value: "find" },
                { value: "findIndex" },
                { value: "lastIndexOf" },
                { value: "pop" },
                { value: "push" },
                { value: "reverse" },
                { value: "shift" },
                { value: "unshift" },
                { value: "slice" },
                { value: "sort" },
                { value: "splice" },
                { value: "includes" },
                { value: "indexOf" },
                { value: "join" },
                { value: "keys" },
                { value: "entries" },
                { value: "values" },
                { value: "forEach" },
                { value: "filter" },
                { value: "flat" },
                { value: "flatMap" },
                { value: "map" },
                { value: "every" },
                { value: "some" },
                { value: "reduce" },
                { value: "reduceRight" },
                { value: "toLocaleString" },
                { value: "toString" },
                { value: "findLast" },
                { value: "findLastIndex" }
            ],
            number: [{ value: 0 }, { value: 1 }],
            symbol: [
                { value: "(symbol Symbol.iterator)" },
                { value: "(symbol Symbol.unscopables)" }
            ]
        })
    })
    it("nullish", () => {
        // @ts-expect-error
        attest(() => type(["keyof", "null"])).throwsAndHasTypeError(
            expectedNeverKeyOfMessage
        )
        // @ts-expect-error
        attest(() => type(["keyof", "undefined"])).throwsAndHasTypeError(
            expectedNeverKeyOfMessage
        )
    })
    it("helper", () => {
        const t = keyOf({ a: "string" })
        attest(t.infer).typed as "a"
        attest(t.node).snap({ string: { value: "a" } })
    })
    it("helper errors", () => {
        attest(() => keyOf("object")).throwsAndHasTypeError(
            expectedNeverKeyOfMessage
        )
    })
})
