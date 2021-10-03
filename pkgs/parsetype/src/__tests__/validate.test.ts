import { errorsAtPaths, parse, typeOf } from ".."

describe("typeOf", () => {
    test("string", () => expect(typeOf("")).toBe("string"))
    test("number", () => expect(typeOf(0)).toBe("number"))
    test("bigint", () => expect(typeOf(BigInt(0))).toBe("bigint"))
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
    test("null", () => expect(typeOf(null)).toBe("null"))
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
    test("string", () => {
        const { validate } = parse("string")
        expect(validate("")).toBe(undefined)
        expect(validate(5)).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'number' is not assignable to defined type 'string'."`
        )
    })
    test("number", () => {
        const { validate } = parse("number")
        expect(validate(4.669)).toBe(undefined)
        expect(validate({ keyWithNumberValue: 5 })).toMatchInlineSnapshot(`
            "Validation error: Extracted type '{
                \\"keyWithNumberValue\\": \\"number\\"
            }' is not assignable to defined type 'number'."
        `)
    })
    test("bigint", () => {
        const { validate } = parse("bigint")
        expect(validate(BigInt(0))).toBe(undefined)
        expect(validate(0)).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'number' is not assignable to defined type 'bigint'."`
        )
    })
    test("boolean", () => {
        const { validate } = parse("boolean")
        expect(validate(true)).toBe(undefined)
        expect(validate(false)).toBe(undefined)
        expect(validate(1)).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'number' is not assignable to defined type 'boolean'."`
        )
    })
    test("symbol", () => {
        const { validate } = parse("symbol")
        expect(validate(Symbol())).toBe(undefined)
        expect(validate("symbol")).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'string' is not assignable to defined type 'symbol'."`
        )
    })
    test("undefined", () => {
        const { validate } = parse("undefined")
        expect(validate(undefined)).toBe(undefined)
        expect(validate("defined")).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'string' is not assignable to defined type 'undefined'."`
        )
        expect(validate(null)).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'null' is not assignable to defined type 'undefined'."`
        )
    })
    test("empty object", () => {
        expect(parse({}).validate({})).toBe(undefined)
    })
    const simpleObject = parse({
        a: { b: "string", c: "number", d: { deep: "null" } }
    })
    test("simple object", () => {
        expect(
            simpleObject.validate({
                a: { b: "nested", c: 5, d: { deep: null } }
            })
        ).toBe(undefined)
        const badValue = { a: { b: "nested", c: 5, d: { deep: {} } } }
        expect(simpleObject.validate(badValue)).toMatchInlineSnapshot(
            `"Validation error at path 'a/d/deep': Extracted type '{}' is not assignable to defined type 'null'."`
        )
    })
    test("multiple errors", () => {
        const reallyBadValue = {
            a: {
                b: null,
                c: Symbol(),
                d: {
                    deep: undefined,
                    shallow: "this wasn't supposed to be here"
                }
            }
        }
        expect(errorsAtPaths(reallyBadValue, simpleObject.definition))
            .toMatchInlineSnapshot(`
            Object {
              "a/b": "Extracted type 'null' is not assignable to defined type 'string'.",
              "a/c": "Extracted type 'symbol' is not assignable to defined type 'number'.",
              "a/d": "Keys do not match between extracted type ({
                \\"deep\\": \\"undefined\\",
                \\"shallow\\": \\"string\\"
            }) and defined type ({
                \\"deep\\": \\"null\\"
            }). Discrepancies:
            {
                \\"added\\": [
                    \\"shallow\\"
                ]
            }",
            }
        `)
        // Let's make sure once that multiple errors are
        expect(simpleObject.validate(reallyBadValue)).toMatchInlineSnapshot(`
            "Multiple validation errors: {
                \\"a/b\\": \\"Extracted type 'null' is not assignable to defined type 'string'.\\",
                \\"a/c\\": \\"Extracted type 'symbol' is not assignable to defined type 'number'.\\",
                \\"a/d\\": \\"Keys do not match between extracted type ({\\\\n    \\\\\\"deep\\\\\\": \\\\\\"undefined\\\\\\",\\\\n    \\\\\\"shallow\\\\\\": \\\\\\"string\\\\\\"\\\\n}) and defined type ({\\\\n    \\\\\\"deep\\\\\\": \\\\\\"null\\\\\\"\\\\n}). Discrepancies:\\\\n{\\\\n    \\\\\\"added\\\\\\": [\\\\n        \\\\\\"shallow\\\\\\"\\\\n    ]\\\\n}\\"
            }"
        `)
    })
    test("generic function", () => {
        const { validate } = parse("function")
        expect(
            validate(function saySomething() {
                console.log("I'm giving up on you")
            })
        ).toBe(undefined)
        expect(validate({})).toMatchInlineSnapshot(
            `"Validation error: Extracted type '{}' is not assignable to defined type 'function'."`
        )
    })
    test("defined function treated as generic for validation", () => {
        const { validate } = parse("(number,object)=>string")
        expect(validate(() => {})).toBe(undefined)
        expect(validate("I promise I'm a function")).toMatchInlineSnapshot(
            `"Validation error: Extracted type 'string' is not assignable to defined type '(number,object)=>string'."`
        )
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
