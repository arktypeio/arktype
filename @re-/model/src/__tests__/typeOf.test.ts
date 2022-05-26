import { assert } from "@re-/assert"
import { typeOf } from "@re-/model"

describe("typeOf", () => {
    it("string", () => {
        assert(typeOf("redo")).equals("'redo'")
        assert(typeOf("")).equals("''")
    })
    it("number", () => {
        assert(typeOf(0)).equals(0)
        assert(typeOf(3.141_59)).equals(3.141_59)
    })
    it("boolean", () => {
        assert(typeOf(true)).equals("true")
        assert(typeOf(false)).equals("false")
    })
    it("bigint", () => {
        assert(typeOf(BigInt(0))).equals(0n)
    })
    it("symbol", () => {
        assert(typeOf(Symbol())).equals("symbol")
    })
    it("undefined", () => {
        const x: any = {}
        assert(typeOf(undefined)).equals("undefined")
        assert(typeOf(x.nonexistent)).equals("undefined")
    })
    it("null", () => {
        assert(typeOf(null)).equals("null")
    })
    it("object", () => {
        assert(typeOf({ a: { b: "nested", c: 5, d: { deep: null } } })).equals({
            a: { b: "'nested'", c: 5, d: { deep: "null" } }
        })
    })
    it("function", () => {
        const saySomething = () => console.log("I'm giving up on you")
        assert(typeOf(saySomething)).equals("function")
    })
    it("array", () => {
        assert(typeOf([7, "up"])).equals([7, "'up'"])
    })
    it("complex", () => {
        assert(typeOf([true, { a: ["ok", [() => []]] }])).equals([
            "true",
            { a: ["'ok'", ["function"]] }
        ])
    })
})
