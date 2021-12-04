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
                "file": "/home/ssalb/redo/pkgs/node/src/__tests__/reflected.ts",
                "from": {
                  "column": 35,
                  "line": 35,
                },
                "to": {
                  "column": 6,
                  "line": 42,
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
                  "line": 75,
                },
                "to": {
                  "column": 6,
                  "line": 80,
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
                },
                "to": {
                  "column": 33,
                  "line": 50,
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
                },
                "to": {
                  "column": 27,
                  "line": 59,
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
                  "line": 72,
                },
                "to": {
                  "column": 65,
                  "line": 72,
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
                "line": 62,
              },
              "to": {
                "column": 6,
                "line": 69,
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
                "line": 89,
              },
              "to": {
                "column": 56,
                "line": 89,
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
              "line": 102,
              "message": "please",
              "method": "getCallPosition",
            }
        `)
    })
})
