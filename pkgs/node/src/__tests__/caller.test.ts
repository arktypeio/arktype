import { caller } from ".."
import { platform } from "os"
import { callMeFromDir, callPipeSeperated } from "./fromDir/reflectedFromDir.js"
import { callMe, callMeAnonymous } from "./reflected.js"

describe("caller", () => {
    test("named", () => {
        const result = callMe()
        expect(result).toMatchInlineSnapshot(`
            {
              "char": 12,
              "file": "reflected.ts",
              "line": 15,
              "method": "callMe",
            }
        `)
    })
    test("anonymous", () => {
        const result = callMeAnonymous()
        expect(result).toMatchInlineSnapshot(`
            {
              "char": 35,
              "file": "reflected.ts",
              "line": 19,
              "method": "callMeAnonymous",
            }
        `)
    })
    test("fromDir", () => {
        const result = callMeFromDir()
        if (platform() === "win32") {
            expect(result).toMatchInlineSnapshot(`
                            {
                              "char": 12,
                              "file": "fromDir\\\\reflectedFromDir.ts",
                              "line": 8,
                              "method": "callMeFromDir",
                            }
                    `)
        } else {
            expect(result).toMatchInlineSnapshot(`
                            {
                              "char": 12,
                              "file": "fromDir/reflectedFromDir.ts",
                              "line": 8,
                              "method": "callMeFromDir",
                            }
                    `)
        }
    })
    test("with custom seperator", () => {
        const result = callPipeSeperated()
        expect(result).toMatchInlineSnapshot(`
            {
              "char": 12,
              "file": "fromDir|reflectedFromDir.ts",
              "line": 14,
              "method": "callPipeSeperated",
            }
        `)
    })
    test("with methodName", () => {
        const inner = () => caller({ methodName: "middle" })
        const middle = () => inner()
        const outer = () => middle()
        expect(outer().method).toBe("outer")
    })
    test("with skip", () => {
        const inner = () =>
            caller({ skip: ({ method }) => method === "middle" })
        const middle = () => inner()
        const outer = () => middle()
        expect(outer().method).toBe("outer")
    })
})
