import { suite, test } from "mocha"
import { type, TypeNode } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("keyof", () => {
    test("object literal", () => {
        const t = type({ a: "123", b: "123" }).keyof()
        attest(t.infer).typed as "a" | "b"
        attest(t.root).is(type("'a'|'b'").root)
    })
    test("overlapping union", () => {
        const t = type({ a: "number", b: "boolean" })
            .or({ b: "number", c: "string" })
            .keyof()
        attest(t.infer).typed as "b"
        attest(t.root).is(type("'b'").root)
    })
    test("non-overlapping union", () => {
        attest(() =>
            type({ a: "number" }).or({ b: "number" }).keyof()
        ).throws.snap(
            'The intersection at $arkRoot of "a" and "b" results in an unsatisfiable type'
        )
    })
    test("non-object", () => {
        const t = type(["keyof", "bigint"])
        attest(t.infer).typed as keyof bigint
        const expected = TypeNode.fromValue(
            "toLocaleString" as const,
            "toString" as const,
            "valueOf" as const,
            Symbol.toStringTag
        )
        attest(t.root).is(expected)
    })
    test("union including non-object", () => {
        attest(() => type({ a: "number" }).or("string").keyof()).throws.snap(
            "Error: Unsatisfiable"
        )
    })
    // const attestHasStringBranches = (
    //     branches: RuleNodes<"string">[],
    //     expectedBranches: RuleNodes<"string">[]
    // ) => {
    //     for (const expected of expectedBranches) {
    //         const expectedString = stringify(expected)
    //         attest(
    //             branches.some((branch) => stringify(branch) === expectedString)
    //         ).equals(true)
    //     }
    // }
    // test("array", () => {
    //     const t = type(["keyof", ["string", "number"]])
    //     attest(t.infer).typed as keyof [string, number]
    //     const node = t.node as DomainsJson
    //     // the array prototype has many items and they vary based on the JS
    //     // flavor we're running in, so just check that the indices from the type
    //     // and one prototype key are present as a heuristic
    //     attestHasStringBranches(node.string as RuleNodes<"string">[], [
    //         { value: "0" },
    //         { value: "1" },
    //         { value: "map" }
    //     ])
    //     attest(node.number).snap([{ value: 0 }, { value: 1 }])
    //     attest(node.symbol).snap([
    //         { value: "(symbol Symbol.iterator)" },
    //         { value: "(symbol Symbol.unscopables)" }
    //     ])
    // })
    // test("wellFormedNonNegativeInteger intersection", () => {
    //     const t = type(["keyof", [{ "1": "1" }, "&", "string[]"]])
    //     const node = t.node as DomainsJson
    //     attestHasStringBranches(node.string as RuleNodes<"string">[], [
    //         { value: "1" },
    //         { regex: "^(?:0|(?:[1-9]\\d*))$" }
    //     ])
    //     attest(node.number).snap([
    //         { value: 1 },
    //         { range: { min: { comparator: ">=", limit: 0 } }, divisor: 1 }
    //     ])
    // })
    // test("nullish", () => {
    //     // @ts-expect-error
    //     attest(() => type(["keyof", "null"])).throwsAndHasTypeError(
    //         expectedNeverKeyOfMessage
    //     )
    //     // @ts-expect-error
    //     attest(() => type(["keyof", "undefined"])).throwsAndHasTypeError(
    //         expectedNeverKeyOfMessage
    //     )
    // })
    // test("helper", () => {
    //     const t = keysOf({ a: "string" })
    //     attest(t.infer).typed as "a"
    //     attest(t.node).snap({ string: { value: "a" } })
    // })
    // test("helper errors", () => {
    //     attest(() => keyOf("object")).throws(expectedNeverKeyOfMessage)
    // })
})
