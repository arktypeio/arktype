import { T } from "ts-toolbelt"
import { callerOf } from "../reflection.js"
import {
    callMe,
    getAllFromDefaultProp,
    getAllFromCustomProp,
    getAllAsFunction,
    getReturnedFunction,
    getSingleProp,
    getUnaccessed,
    getUndefined
} from "./reflected.js"

describe("callers", () => {
    test("caller", () => {
        const result = callMe()
        expect(result).toMatchInlineSnapshot(`
            {
              "column": 12,
              "file": "src/__tests__/reflected.ts",
              "line": 9,
              "method": "callMe",
            }
        `)
    })
    test("callerOf", () => {
        const inner = () => callerOf("middle")
        const middle = () => inner()
        const outer = () => middle()
        expect(outer().method).toBe("outer")
    })
})

describe("withArgsRange", () => {
    test("all from default", () => {
        expect(getAllFromDefaultProp()).toMatchInlineSnapshot(`
            {
              "message": "testing source positions really really sucks",
              "range": {
                "file": "src/__tests__/reflected.ts",
                "from": {
                  "column": 5,
                  "line": 44,
                },
                "to": {
                  "column": 6,
                  "line": 51,
                },
              },
            }
        `)
    })
    test("all from custom", () => {
        expect(getAllFromCustomProp()).toMatchInlineSnapshot(`
            {
              "message": "i love you",
              "range": {
                "file": "src/__tests__/reflected.ts",
                "from": {
                  "column": 5,
                  "line": 54,
                },
                "to": {
                  "column": 56,
                  "line": 54,
                },
              },
            }
        `)
    })
    test("all as function", () => {
        expect(getAllAsFunction()).toMatchInlineSnapshot(`
            {
              "message": "this is fine",
              "range": {
                "file": "src/__tests__/reflected.ts",
                "from": {
                  "column": 5,
                  "line": 57,
                },
                "to": {
                  "column": 54,
                  "line": 57,
                },
              },
            }
        `)
    })
    test("returned function", () => {
        expect(getReturnedFunction("Bernard")).toMatchInlineSnapshot(`
            {
              "message": "yeah ok good",
              "name": "Bernard",
              "range": {
                "file": "src/__tests__/reflected.ts",
                "from": {
                  "column": 5,
                  "line": 63,
                },
                "to": {
                  "column": 60,
                  "line": 63,
                },
              },
            }
        `)
    })
    test("single prop", () => {
        expect(getSingleProp()).toMatchInlineSnapshot(`
            {
              "file": "src/__tests__/reflected.ts",
              "from": {
                "column": 5,
                "line": 60,
              },
              "to": {
                "column": 73,
                "line": 60,
              },
            }
        `)
    })
    test("unaccessed", () => {
        expect(getUnaccessed()).toMatchInlineSnapshot(`
            {
              "
            This function's return value cannot be accessed directly.
            To use it, you must access a property of the object it returns, e.g.:
                context(...args).prop
            or access the entire object via the provided alias, e.g.:
                context(...args).all
            ": undefined,
            }
        `)
    })
    test("undefined prop", () => {
        expect(getUndefined()).toBe(undefined)
    })
})
