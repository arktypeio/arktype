import { suite, test } from "mocha"
import { type, TypeNode } from "../../src/main.js"
import { writeUnsatisfiableExpressionError } from "../../src/parse/ast/ast.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Type } from "../../src/type.js"
import { attest } from "../attest/main.js"

suite("keyof", () => {
    test("primitive", () => {
        const t = type("keyof bigint")
        attest(t.infer).typed as keyof bigint
        const expected = TypeNode.fromValue(
            "toLocaleString" as const,
            "toString" as const,
            "valueOf" as const,
            Symbol.toStringTag
        )
        attest(t.root).is(expected)
    })
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
        attest(() => type({ a: "number" }).or({ b: "number" }).keyof()).throws(
            'Intersection at $arkRoot of "a" and "b" results in an unsatisfiable type'
        )
    })
    test("tuple expression", () => {
        const t = type(["keyof", { a: "string" }])
        attest(t.infer).typed as "a"
        attest(t.root).is(TypeNode.fromValue("a" as const))
    })
    test("union including non-object", () => {
        attest(() => type({ a: "number" }).or("boolean").keyof()).throws.snap(
            'Error: Intersection at $arkRoot of "a" and "toString" or "valueOf" results in an unsatisfiable type'
        )
    })
    test("unsatisfiable tuple expression", () => {
        // @ts-expect-error
        attest(() => type(["keyof", "null"])).throwsAndHasTypeError(
            writeUnsatisfiableExpressionError("keyof null")
        )
    })
    test("unsatisfiable string expression", () => {
        // @ts-expect-error
        attest(() => type("keyof undefined")).throwsAndHasTypeError(
            writeUnsatisfiableExpressionError("keyof undefined")
        )
    })
    test("unsatisfiable chained", () => {
        const getKeyOfObject = () => type("object").keyof()
        attest({} as ReturnType<typeof getKeyOfObject>).typed as Type<
            never,
            Ark
        >
        attest(getKeyOfObject).throws(
            writeUnsatisfiableExpressionError("keyof object")
        )
    })
    test("multiple keyofs", () => {
        const t = type("keyof keyof string")
        attest(t.infer).typed as "toString" | "valueOf"
        attest(t.root).is(
            TypeNode.fromValue("toString" as const, "valueOf" as const)
        )
    })
    test("groupable", () => {
        const t = type("(keyof symbol & string)[]")
        attest(t.infer).typed as ("toString" | "valueOf" | "description")[]
        attest(t.root).is(
            TypeNode.fromValue(
                "toString" as const,
                "valueOf" as const,
                "description" as const
            ).array()
        )
    })
    test("intersection precedence", () => {
        const t = type("keyof symbol & symbol")
        attest(t.infer).typed as
            | typeof Symbol.toStringTag
            | typeof Symbol.toPrimitive
        attest(t.root).unknown.is(
            TypeNode.fromValue(Symbol.toStringTag, Symbol.toPrimitive)
        )
    })
    test("union precedence", () => {
        const t = type("keyof boolean | number")
        attest(t.infer).typed as "valueOf" | number
        // for some reason TS doesn't include toString as a keyof boolean?
        // given it is included in keyof string, it seems like a TS bug
        attest(t.root).unknown.is(type("number | 'valueOf' | 'toString'").root)
    })
    test("missing operand", () => {
        // @ts-expect-error
        attest(() => type("keyof "))
            .throws("Token '&' requires a right operand")
            // it tries to autocomplete, so this is just a possible completion that would be included
            .types.errors("keyof bigint")
    })
    test("invalid operand", () => {
        // @ts-expect-error
        attest(() => type("keyof nope")).throwsAndHasTypeError(
            writeUnresolvableMessage("nope")
        )
    })
    // TODO: numeric
    test("array", () => {
        const t = type("keyof string[]")
        attest(t.infer).typed as keyof string[]
        // the array prototype has many items and they vary based on the JS
        // flavor we're running in, so just check that the indices from the type
        // and one prototype key are present as a heuristic\
        t.assert("0")
        t.assert("354")
        t.assert("map")
        t.assert(Symbol.iterator)
        attest(() => t.assert("0.1")).throws.snap(
            'TypeError: / must be a string matching /^(?:0|(?:[1-9]\\d*))$/, "length", "at", "concat", "copyWithin", "fill", "find", "findIndex", "lastIndexOf", "pop", "push", "reverse", "shift", "unshift", "slice", "sort", "splice", "includes", "indexOf", "join", "keys", "entries", "values", "forEach", "filter", "flat", "flatMap", "map", "every", "some", "reduce", "reduceRight", "toLocaleString", "toString", "findLast", "findLastIndex", (symbol Symbol.iterator) or (symbol Symbol.unscopables) (was "0.1")'
        )
        attest(() => t.assert("-1")).throws.snap(
            'TypeError: / must be a string matching /^(?:0|(?:[1-9]\\d*))$/, "length", "at", "concat", "copyWithin", "fill", "find", "findIndex", "lastIndexOf", "pop", "push", "reverse", "shift", "unshift", "slice", "sort", "splice", "includes", "indexOf", "join", "keys", "entries", "values", "forEach", "filter", "flat", "flatMap", "map", "every", "some", "reduce", "reduceRight", "toLocaleString", "toString", "findLast", "findLastIndex", (symbol Symbol.iterator) or (symbol Symbol.unscopables) (was "-1")'
        )
    })
    test("tuple", () => {
        const t = type(["keyof", ["string", "number"]])
        attest(t.infer).typed as keyof [string, number]
        t.assert("1")
        t.assert("map")
        attest(() => t.assert("2")).throws.snap(
            'TypeError: / must be "length", "0", "1", "at", "concat", "copyWithin", "fill", "find", "findIndex", "lastIndexOf", "pop", "push", "reverse", "shift", "unshift", "slice", "sort", "splice", "includes", "indexOf", "join", "keys", "entries", "values", "forEach", "filter", "flat", "flatMap", "map", "every", "some", "reduce", "reduceRight", "toLocaleString", "toString", "findLast", "findLastIndex", (symbol Symbol.iterator) or (symbol Symbol.unscopables) (was "2")'
        )
    })
    test("wellFormedNonNegativeInteger intersection", () => {
        const t = type(["keyof", [{ "1": "'foo'" }, "&", "string[]"]])
        attest(t.root.toString()).snap(
            'string and /^(?:0|(?:[1-9]\\d*))$/ or "length" or "at" or "concat" or "copyWithin" or "fill" or "find" or "findIndex" or "lastIndexOf" or "pop" or "push" or "reverse" or "shift" or "unshift" or "slice" or "sort" or "splice" or "includes" or "indexOf" or "join" or "keys" or "entries" or "values" or "forEach" or "filter" or "flat" or "flatMap" or "map" or "every" or "some" or "reduce" or "reduceRight" or "toLocaleString" or "toString" or "findLast" or "findLastIndex" or (symbol Symbol.iterator) or (symbol Symbol.unscopables)'
        )
    })
})
