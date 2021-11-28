import { callerOf } from "../reflection.js"
import { callMe, getMessageWithRange } from "./reflected.js"

describe("reflection", () => {
    test("caller", () => {
        const result = callMe()
        expect(result).toMatchInlineSnapshot(`
            {
              "column": 12,
              "file": "/home/ssalb/redo/pkgs/utils/src/__tests__/reflected.ts",
              "line": 6,
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
    test("withArgsRange", () => {
        expect(getMessageWithRange()).toMatchInlineSnapshot(`
            {
              "message": "testing source positions really really sucks",
              "range": {
                "file": "/home/ssalb/redo/pkgs/utils/src/__tests__/reflected.ts",
                "from": {
                  "column": 5,
                  "line": 17,
                  "method": "getMessageWithRange",
                },
                "to": {
                  "column": 6,
                  "line": 24,
                  "method": "getMessageWithRange",
                },
              },
            }
        `)
    })
})
