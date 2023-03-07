import { describe, it } from "mocha"
import { keyOf, type } from "../../src/main.ts"
import type { Branch } from "../../src/nodes/branch.ts"
import type { DomainsNode } from "../../src/nodes/node.ts"
import { writeImplicitNeverMessage } from "../../src/parse/ast/intersection.ts"
import { Path } from "../../src/utils/paths.ts"
import { stringify } from "../../src/utils/serialize.ts"
import { attest } from "../attest/main.ts"

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
    const attestHasStringBranches = (
        branches: Branch<"string">[],
        expectedBranches: Branch<"string">[]
    ) => {
        for (const expected of expectedBranches) {
            const expectedString = stringify(expected)
            attest(
                branches.some((branch) => stringify(branch) === expectedString)
            ).equals(true)
        }
    }
    it("array", () => {
        const t = type(["keyof", ["string", "number"]])
        attest(t.infer).typed as keyof [string, number]
        const node = t.node as DomainsNode
        // the array prototype has many items and they vary based on the JS
        // flavor we're running in, so just check that the indices from the type
        // and one prototype key are present as a heuristic
        attestHasStringBranches(node.string as Branch<"string">[], [
            { value: "0" },
            { value: "1" },
            { value: "map" }
        ])
        attest(node.number).snap([{ value: 0 }, { value: 1 }])
        attest(node.symbol).snap([
            { value: "(symbol Symbol.iterator)" },
            { value: "(symbol Symbol.unscopables)" }
        ])
    })
    it("wellFormedNonNegativeInteger intersection", () => {
        const t = type(["keyof", [{ "1": "1" }, "&", "string[]"]])
        const node = t.node as DomainsNode
        attestHasStringBranches(node.string as Branch<"string">[], [
            { value: "1" },
            { regex: "^(?:0|(?:[1-9]\\d*))$" }
        ])
        attest(node.number).snap([
            { value: 1 },
            { range: { min: { comparator: ">=", limit: 0 } }, divisor: 1 }
        ])
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
        attest(() => keyOf("object")).throws(expectedNeverKeyOfMessage)
    })
})
