import { typeOf } from "@re-/model"

describe("typeOf", () => {
    test("string", () => {
        expect(typeOf("redo")).toBe("'redo'")
        expect(typeOf("")).toBe("''")
    })
    test("number", () => {
        expect(typeOf(0)).toBe(0)
        expect(typeOf(3.141_59)).toBe(3.141_59)
    })
    test("boolean", () => {
        expect(typeOf(true)).toBe("true")
        expect(typeOf(false)).toBe("false")
    })
    test("bigint", () => expect(typeOf(BigInt(0))).toBe(0n))
    test("symbol", () => expect(typeOf(Symbol())).toBe("symbol"))
    test("undefined", () => {
        const x: any = {}
        expect(typeOf()).toBe("undefined")
        expect(typeOf(x.nonexistent)).toBe("undefined")
    })
    test("null", () => expect(typeOf(null)).toBe("null"))
    test("object", () => {
        expect(
            typeOf({ a: { b: "nested", c: 5, d: { deep: null } } })
        ).toStrictEqual({
            a: { b: "'nested'", c: 5, d: { deep: "null" } }
        })
    })
    test("function", () => {
        const saySomething = () => console.log("I'm giving up on you")
        expect(typeOf(saySomething)).toBe("function")
    })
    test("array", () => {
        expect(typeOf([7, "up"])).toStrictEqual([7, "'up'"])
    })
    test("complex", () => {
        expect(typeOf([true, { a: ["ok", [() => []]] }])).toStrictEqual([
            "true",
            { a: ["'ok'", ["function"]] }
        ])
    })
})
