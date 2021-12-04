import { caller } from ".."
import { callMe, callMeAnonymous } from "./reflected.js"

describe("caller", () => {
    test("named", () => {
        const result = callMe()
        expect(result).toMatchInlineSnapshot(`
            {
              "column": 12,
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
              "column": 33,
              "file": "reflected.ts",
              "line": 19,
              "method": "callMeAnonymous",
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
