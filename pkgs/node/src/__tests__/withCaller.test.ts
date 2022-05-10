import {
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

describe("withArgsRange", () => {
    test("all using thunk", () => {
        expect(getAllUsingThunk()).toMatchInlineSnapshot(`
            {
              "message": "testing source positions really really sucks",
              "range": {
                "file": "reflected.ts",
                "from": {
                  "column": 51,
                  "line": 35,
                  "method": "getAllUsingThunk",
                },
                "to": {
                  "column": 6,
                  "line": 42,
                  "method": "getAllUsingThunk",
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
                "file": "reflected.ts",
                "from": {
                  "column": 70,
                  "line": 79,
                  "method": "getAllUsingCallback",
                },
                "to": {
                  "column": 6,
                  "line": 84,
                  "method": "getAllUsingCallback",
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
                  "line": 50,
                  "method": "getAllUsingProp",
                },
                "to": {
                  "column": 33,
                  "line": 50,
                  "method": "getAllUsingProp",
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
                  "line": 59,
                  "method": "getAllUsingPropThunk",
                },
                "to": {
                  "column": 27,
                  "line": 59,
                  "method": "getAllUsingPropThunk",
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
                "file": "reflected.ts",
                "from": {
                  "column": 59,
                  "line": 72,
                  "method": "getForwardedReturn",
                },
                "to": {
                  "column": 6,
                  "line": 76,
                  "method": "getForwardedReturn",
                },
              },
            }
        `)
    })
    test("single prop", () => {
        expect(getSingleProp()).toMatchInlineSnapshot(`
            {
              "file": "reflected.ts",
              "from": {
                "column": 51,
                "line": 62,
                "method": "getSingleProp",
              },
              "to": {
                "column": 6,
                "line": 69,
                "method": "getSingleProp",
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
              "file": "reflected.ts",
              "from": {
                "column": 51,
                "line": 93,
                "method": "getPropFromChainedCall",
              },
              "to": {
                "column": 72,
                "line": 93,
                "method": "getPropFromChainedCall",
              },
            }
        `)
    })
})

describe("call position", () => {
    test("simple", () => {
        expect(getCallPosition("please!")).toMatchInlineSnapshot(`
            {
              "column": 6,
              "file": "reflected.ts",
              "line": 106,
              "message": "please!",
              "method": "getCallPosition",
            }
        `)
    })
})
