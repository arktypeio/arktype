import { caller } from "../reflection.js"
import {
    callMe,
    getAllUsingThunk,
    getAllUsingCallback,
    getAllUsingProp,
    getAllUsingPropThunk,
    getSingleProp,
    getForwardedReturn,
    getUndefined
} from "./reflected.js"

describe("callers", () => {
    test("caller snapshot", () => {
        const result = callMe("in the night")
        expect(result).toMatchInlineSnapshot(`
            {
              "column": 12,
              "file": "reflected.ts",
              "line": 9,
              "method": "callMe",
            }
        `)
    })
    test("caller of method", () => {
        const inner = () => caller({ methodName: "middle" })
        const middle = () => inner()
        const outer = () => middle()
        expect(outer().method).toBe("outer")
    })
    test("caller skip", () => {
        const inner = () =>
            caller({ skip: ({ method }) => method === "middle" })
        const middle = () => inner()
        const outer = () => middle()
        expect(outer().method).toBe("outer")
    })
})

describe("withArgsRange", () => {
    test("all using thunk", () => {
        expect(getAllUsingThunk()).toMatchInlineSnapshot(`
            {
              "message": "testing source positions really really sucks",
              "range": {
                "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
                "from": {
                  "column": 35,
                  "line": 26,
                },
                "to": {
                  "column": 6,
                  "line": 33,
                },
              },
            }
        `)
    })
    test("all using callback", () => {
        expect(getAllUsingCallback()).toMatchInlineSnapshot(`
            {
              "message": "chain me up",
              "range": {
                "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
                "from": {
                  "column": 58,
                  "line": 66,
                },
                "to": {
                  "column": 79,
                  "line": 66,
                },
              },
            }
        `)
    })
    test("all using prop", () => {
        expect(getAllUsingProp()).toMatchInlineSnapshot(`
            {
              "message": "eat more borscht",
              "range": {
                "file": "reflected.ts",
                "from": {
                  "column": 7,
                  "line": 41,
                },
                "to": {
                  "column": 33,
                  "line": 41,
                },
              },
            }
        `)
    })
    test("all using prop thunk", () => {
        expect(getAllUsingPropThunk()).toMatchInlineSnapshot(`
            {
              "message": "i love you",
              "range": {
                "file": "reflected.ts",
                "from": {
                  "column": 7,
                  "line": 50,
                },
                "to": {
                  "column": 27,
                  "line": 50,
                },
              },
            }
        `)
    })
    test("forwarded return", () => {
        expect(getForwardedReturn("Bernard")).toMatchInlineSnapshot(
            `[Function]`
        )
    })
    test("single prop", () => {
        expect(getSingleProp()).toMatchInlineSnapshot(`
            {
              "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
              "from": {
                "column": 35,
                "line": 53,
              },
              "to": {
                "column": 6,
                "line": 60,
              },
            }
        `)
    })
    test("undefined prop", () => {
        expect(getUndefined()).toBe(undefined)
    })
})
