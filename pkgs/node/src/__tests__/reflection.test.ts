import { caller, withCallRange } from "../reflection.js"
import {
    callMe,
    getAllUsingThunk,
    getAllUsingCallback,
    getAllUsingProp,
    getAllUsingPropThunk,
    getSingleProp,
    getForwardedReturn,
    getUndefined,
    getPropFromChainedCall,
    getCallPosition
} from "./reflected.js"

describe("callers", () => {
    test("caller snapshot", () => {
        const result = callMe("in the night")
        expect(result).toMatchInlineSnapshot(`
            {
              "column": 12,
              "file": "reflected.ts",
              "line": 15,
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
                  "line": 32,
                },
                "to": {
                  "column": 6,
                  "line": 39,
                },
              },
            }
        `)
    })
    test("all using callback", () => {
        expect(getAllUsingCallback()).toMatchInlineSnapshot(`
            {
              "message": "call me back please",
              "range": {
                "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
                "from": {
                  "column": 58,
                  "line": 72,
                },
                "to": {
                  "column": 6,
                  "line": 77,
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
                  "line": 47,
                },
                "to": {
                  "column": 33,
                  "line": 47,
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
                  "line": 56,
                },
                "to": {
                  "column": 27,
                  "line": 56,
                },
              },
            }
        `)
    })
    test("forwarded return", () => {
        expect(getForwardedReturn("Bernard")).toMatchInlineSnapshot(`
            {
              "message": "yeah ok good",
              "name": "Bernard",
              "range": {
                "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
                "from": {
                  "column": 43,
                  "line": 69,
                },
                "to": {
                  "column": 65,
                  "line": 69,
                },
              },
            }
        `)
    })
    test("single prop", () => {
        expect(getSingleProp()).toMatchInlineSnapshot(`
            {
              "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
              "from": {
                "column": 35,
                "line": 59,
              },
              "to": {
                "column": 6,
                "line": 66,
              },
            }
        `)
    })
    test("undefined prop", () => {
        expect(getUndefined()).toBe(undefined)
    })
    test("as chain", () => {
        expect(getPropFromChainedCall()).toMatchInlineSnapshot(`
            {
              "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
              "from": {
                "column": 35,
                "line": 86,
              },
              "to": {
                "column": 56,
                "line": 86,
              },
            }
        `)
    })
})

describe("call position", () => {
    test("simple", () => {
        expect(getCallPosition("please")).toMatchInlineSnapshot(`
            {
              "column": 6,
              "file": "reflected.ts",
              "line": 99,
              "message": "please",
              "method": "getCallPosition",
            }
        `)
    })
})
