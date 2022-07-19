import { assert } from "../src/index.js"
const o = { re: "do" }

describe("Assertions", () => {
    it("type toString", () => {
        assert(o).type.toString("{ re: string; }")
        assert(o).type.toString.is("{ re: string; }")
    })
    it("typed", () => {
        assert(o).typed as { re: string }
    })
    it("equals", () => {
        assert(o).equals({ re: "do" })
    })
    it("union of function chainable", () => {
        const t = {} as object | ((...args: any[]) => any)
        assert(t).equals({})
    })
    it("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        assert(actual).typed as {
            b: boolean
            a: boolean
        }
    })
})
