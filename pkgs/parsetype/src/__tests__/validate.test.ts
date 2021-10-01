import { parse, typeOf } from ".."

describe("typeOf", () => {
    test("string", () => expect(typeOf("")).toBe("string"))
    test("number", () => expect(typeOf(0)).toBe("number"))
    test("bigint", () => expect(typeOf(0n)).toBe("bigint"))
    test("boolean", () => {
        expect(typeOf(true)).toBe("true")
        expect(typeOf(false)).toBe("false")
    })
    test("symbol", () => expect(typeOf(Symbol())).toBe("symbol"))
    test("undefined", () => {
        const x: any = {}
        expect(typeOf(undefined)).toBe("undefined")
        expect(typeOf(x.nonexistent)).toBe("undefined")
    })
    test("object", () => {
        expect(
            typeOf({ a: { b: "nested", c: 5, d: { deep: null } } })
        ).toStrictEqual({
            a: { b: "string", c: "number", d: { deep: "null" } }
        })
    })
    test("function", () => {
        expect(
            typeOf(function saySomething() {
                console.log("I'm giving up on you")
            })
        ).toBe("function")
        expect(typeOf((someParam: any) => "someReturn")).toBe("function")
    })
    test("array", () => {
        expect(typeOf([7, "up"])).toStrictEqual(["number", "string"])
    })
    test("complex", () => {
        expect(typeOf([true, { a: ["ok", [() => {}]] }])).toStrictEqual([
            "true",
            { a: ["string", ["function"]] }
        ])
    })
})

describe("validate", () => {
    test("", () => {})
})
