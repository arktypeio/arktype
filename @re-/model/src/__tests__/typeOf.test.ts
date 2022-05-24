import { assert } from "@re-/assert"
import { typeOf } from "@re-/model"

describe("typeOf", () => {
    test("string", () => {
        assert(typeOf("redo")).equals("'redo'")
        assert(typeOf("")).equals("''")
    })
    test("number", () => {
        assert(typeOf(0)).equals(0)
        assert(typeOf(3.141_59)).equals(3.141_59)
    })
    test("boolean", () => {
        assert(typeOf(true)).equals("true")
        assert(typeOf(false)).equals("false")
    })
    test("bigint", () => assert(typeOf(BigInt(0))).equals(0n))
    test("symbol", () => assert(typeOf(Symbol())).equals("symbol"))
    test("undefined", () => {
        const x: any = {}
        assert(typeOf(undefined)).equals("undefined")
        assert(typeOf(x.nonexistent)).equals("undefined")
    })
    test("null", () => assert(typeOf(null)).equals("null"))
    test("object", () => {
        assert(typeOf({ a: { b: "nested", c: 5, d: { deep: null } } })).equals({
            a: { b: "'nested'", c: 5, d: { deep: "null" } }
        })
    })
    test("function", () => {
        const saySomething = () => console.log("I'm giving up on you")
        assert(typeOf(saySomething)).equals("function")
    })
    test("array", () => {
        assert(typeOf([7, "up"])).equals([7, "'up'"])
    })
    test("complex", () => {
        assert(typeOf([true, { a: ["ok", [() => []]] }])).equals([
            "true",
            { a: ["'ok'", ["function"]] }
        ])
    })
})
