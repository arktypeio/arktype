import { suite, test } from "mocha"
import { node, type } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("keyof", () => {
    test("autocompletion", () => {
        // @ts-expect-error
        attest(() => type("k")).types.errors("keyof ")
    })
    test("root expression", () => {
        const t = type("keyof", "Date")
        attest(t.infer).typed as keyof Date
        attest(t.condition).equals(node({ basis: Date }).keyof().condition)
    })
    test("primitive", () => {
        const t = type("keyof bigint")
        attest(t.infer).typed as keyof bigint
        const expected = node.literal(
            "toLocaleString",
            "toString",
            "valueOf",
            Symbol.toStringTag
        )
        attest(t.condition).is(expected.condition)
    })
    test("object literal", () => {
        const t = type({ a: "123", b: "123" }).keyof()
        attest(t.infer).typed as "a" | "b"
        attest(t.condition).equals(type("'a'|'b'").condition)
    })
    test("overlapping union", () => {
        const t = type({ a: "number", b: "boolean" })
            .or({ b: "number", c: "string" })
            .keyof()
        attest(t.infer).typed as "b"
        attest(t.condition).equals(type("'b'").condition)
    })
    test("non-overlapping union", () => {
        attest(() => type({ a: "number" }).or({ b: "number" }).keyof()).throws(
            'Intersection of "a" and "b" results in an unsatisfiable type'
        )
    })
    test("tuple expression", () => {
        const t = type(["keyof", { a: "string" }])
        attest(t.infer).typed as "a"
        attest(t.condition).equals(node.literal("a").condition)
    })
    test("union including non-object", () => {
        attest(() => type({ a: "number" }).or("boolean").keyof()).throws(
            'Intersection of "toString" or "valueOf" and "a" results in an unsatisfiable type'
        )
    })
    test("unsatisfiable", () => {
        attest(() => type("keyof undefined")).throws(
            "Intersection of unknown and never results in an unsatisfiable type"
        )
    })
    test("multiple keyofs", () => {
        const t = type("keyof keyof string")
        attest(t.infer).typed as "toString" | "valueOf"
        attest(t.condition).equals(
            node.literal("toString", "valueOf").condition
        )
    })
    test("groupable", () => {
        const t = type("(keyof symbol & string)[]")
        attest(t.infer).typed as ("toString" | "valueOf" | "description")[]
        attest(t.condition).equals(
            node.literal("toString", "valueOf", "description").array().condition
        )
    })
    test("intersection precedence", () => {
        const t = type("keyof symbol & symbol")
        attest(t.infer).typed as
            | typeof Symbol.toStringTag
            | typeof Symbol.toPrimitive
        attest(t.condition).is(
            node.literal(Symbol.toStringTag, Symbol.toPrimitive).condition
        )
    })
    test("union precedence", () => {
        const t = type("keyof boolean | number")
        attest(t.infer).typed as "valueOf" | number
        // for some reason TS doesn't include toString as a keyof boolean?
        // given it is included in keyof string, it seems like an anomaly, but we include it
        attest(t.condition).equals(
            type("number | 'valueOf' | 'toString'").condition
        )
    })
    test("missing operand", () => {
        // @ts-expect-error
        attest(() => type("keyof "))
            .throws(writeMissingRightOperandMessage("keyof", ""))
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
        // and one prototype key are present as a heuristic
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
        const a = type([{ "1": "'foo'" }, "&", "string[]"])
        const t = type("keyof", a)
        // TODO should still include wellFormed
        attest(t.root.toString()).snap(
            '"1" or "at" or "concat" or "copyWithin" or "entries" or "every" or "fill" or "filter" or "find" or "findIndex" or "findLast" or "findLastIndex" or "flat" or "flatMap" or "forEach" or "includes" or "indexOf" or "join" or "keys" or "lastIndexOf" or "length" or "map" or "pop" or "push" or "reduce" or "reduceRight" or "reverse" or "shift" or "slice" or "some" or "sort" or "splice" or "toLocaleString" or "toString" or "unshift" or "values" or (symbol Symbol.iterator) or (symbol Symbol.unscopables) or /^(?:0|(?:[1-9]\\d*))$/'
        )
    })
})
