import { platform } from "node:os"
import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { caller } from "../index.js"
import { callMeFromDir, callPipeSeperated } from "./fromDir/reflectedFromDir.js"
import { callMe, callMeAnonymous } from "./reflected.js"

describe("caller", () => {
    test("named", () => {
        const result = callMe()
        assert(result).snap()
    })
    test("anonymous", () => {
        const result = callMeAnonymous()
        assert(result).snap({
            char: 35,
            file: "reflected.ts",
            line: 19,
            method: "callMeAnonymous"
        })
    })
    test("fromDir", () => {
        const result = callMeFromDir()
        if (platform() === "win32") {
            assert(result).snap()
        } else {
            assert(result).snap()
        }
    })
    test("with custom seperator", () => {
        const result = callPipeSeperated()
        assert(result).snap({
            char: 12,
            file: "fromDir|reflectedFromDir.ts",
            line: 14,
            method: "callPipeSeperated"
        })
    })
    test("with methodName", () => {
        const inner = () => caller({ methodName: "middle" })
        const middle = () => inner()
        const outer = () => middle()
        assert(outer().method).equals("outer")
    })
    test("with skip", () => {
        const inner = () =>
            caller({ skip: ({ method }) => method === "middle" })
        const middle = () => inner()
        const outer = () => middle()
        assert(outer().method).equals("outer")
    })
})
