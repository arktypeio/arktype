import { suite, test } from "mocha"
import { type, TypeNode } from "../../src/main.js"
import { writeUnsatisfiableExpressionError } from "../../src/parse/ast/ast.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Type } from "../../src/type.js"
import { attest } from "../attest/main.js"

suite("keyof", () => {
    test("object literal", () => {
        const t = type({ a: "123", b: "123" }).keyof()
        attest(t.infer).typed as "a" | "b"
        attest(t.definition).snap(["keyof", { a: "123", b: "123" }])
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
    test("tuple expression", () => {
        const t = type(["keyof", { a: "string" }])
        attest(t.infer).typed as "a"
        attest(t.root).is(TypeNode.fromValue("a" as const))
    })
    test("unsatisfiable tuple expression", () => {
        // @ts-expect-error
        attest(() => type(["keyof", "null"])).throws(
            writeUnsatisfiableExpressionError("keyof null")
        )
    })
    test("union including non-object", () => {
        attest(() => type({ a: "number" }).or("boolean").keyof()).throws.snap(
            'Error: Intersection at $arkRoot of "a" and "toString" or "valueOf" results in an unsatisfiable type'
        )
    })
    test("null", () => {
        const getKeyOfNull = () => type("null").keyof()
        attest({} as ReturnType<typeof getKeyOfNull>).typed as Type<never, Ark>
        attest(getKeyOfNull).throws(
            writeUnsatisfiableExpressionError("keyof null")
        )
    })
    test("undefined", () => {
        const getKeyOfUndefined = () => type("undefined").keyof()
        attest({} as ReturnType<typeof getKeyOfUndefined>).typed as Type<
            never,
            Ark
        >
        attest(getKeyOfUndefined).throws(
            writeUnsatisfiableExpressionError("keyof undefined")
        )
    })
    // TODO: numeric
    test("array", () => {
        const t = type("string[]").keyof()
        attest(t.infer).typed as keyof string[]
        // the array prototype has many items and they vary based on the JS
        // flavor we're running in, so just check that the indices from the type
        // and one prototype key are present as a heuristic\
        t.assert("0")
        t.assert("354")
        t.assert("map")
        t.assert(Symbol.iterator)
        attest(() => t.assert("0.1")).throws.snap()
        attest(() => t.assert("-1")).throws.snap()
    })
    test("tuple", () => {
        const t = type(["keyof", ["string", "number"]])
        attest(t.infer).typed as keyof [string, number]
        t.assert("1")
        t.assert("map")
        attest(() => t.assert("2")).throws.snap()
    })
    test("wellFormedNonNegativeInteger intersection", () => {
        const t = type(["keyof", [{ "1": "'foo'" }, "&", "string[]"]])
        attest(t.root.toString()).snap(
            '"1" or "string" and /^(?:0|(?:[1-9]\\d*))$/ or "length" or "name" or "prototype" or "isArray" or "from" or "of" or (symbol Symbol.species) or "arguments" or "caller" or "apply" or "bind" or "call" or "toString" or (symbol Symbol.hasInstance)'
        )
    })
})
