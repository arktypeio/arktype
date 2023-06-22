import { suite, test } from "mocha"
import { type } from "../../src/main.js"

suite("regex intersections", () => {
    test("distinct strings", () => {
        const t = type("/a/&/b/")
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b"]
        //     }
        // })
    })
    test("identical strings", () => {
        const t = type("/a/&/a/")
        // attest(t.node).snap({
        //     string: {
        //         regex: "a"
        //     }
        // })
    })
    test("string and list", () => {
        const left = type(["/a/", "&", "/b/&/c/"])
        // attest(left).snap({
        //     string: { regex: ["b", "c", "a"] }
        // })
        const right = type(["/a/", "&", "/b/&/c/"])
        // attest(right.node).snap({
        //     string: { regex: ["a", "b", "c"] }
        // })
    })
    test("redundant string and list", () => {
        // const expected: ResolvedNode = {
        //     string: {
        //         regex: ["a", "b", "c"]
        //     }
        // }
        const leftString = type(["/a/", "&", "/a/&/b/&/c/"])
        const rightString = type(["/a/&/b/&/c/", "&", "/c/"])
        // attest().equals(expected)
        // attest().equals(expected)
    })
    test("distinct lists", () => {
        const t = type(["/a/&/b/", "&", "/c/&/d/"])
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b", "c", "d"]
        //     }
        // })
    })
    test("overlapping lists", () => {
        const t = type(["/a/&/b/", "&", "/c/&/b/"])
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b", "c"]
        //     }
        // })
    })
    test("identical lists", () => {
        const t = type(["/a/&/b/", "&", "/b/&/a/"])
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b"]
        //     }
        // })
    })
})
