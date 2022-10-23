import { platform } from "node:os"
import { basename } from "node:path"
import { assert } from "@arktype/check"
import { describe, test } from "mocha"
import { caller, fileName, getCallStack } from "../index.js"
import { callMeFromDir, callPipeSeperated } from "./fromDir/reflectedFromDir.js"
import { callMe, callMeAnonymous } from "./reflected.js"

describe("caller", () => {
    test("named", () => {
        const result = callMe()
        assert(result).snap({
            method: `callMe`,
            file: `reflected.ts`,
            line: 8,
            char: 12
        })
    })
    test("anonymous", () => {
        const result = callMeAnonymous()
        assert(result).snap({
            method: `callMeAnonymous`,
            file: `reflected.ts`,
            line: 11,
            char: 68
        })
    })
    test("fromDir", () => {
        const result = callMeFromDir()
        if (platform() === "win32") {
            assert(result).snap({
                method: `callMeFromDir`,
                file: `fromDir\\reflectedFromDir.ts`,
                line: 8,
                char: 12
            })
        } else {
            assert(result).snap({
                method: `callMeFromDir`,
                file: `fromDir/reflectedFromDir.ts`,
                line: 8,
                char: 12
            })
        }
    })
    test("with custom seperator", () => {
        const result = callPipeSeperated()
        assert(result).snap({
            method: `callPipeSeperated`,
            file: `fromDir|reflectedFromDir.ts`,
            line: 14,
            char: 12
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

    test("getCallStack", () => {
        const stack = getCallStack()
        assert(stack[0]).equals("Error")
        assert(stack[1].includes(basename(fileName()))).is(true)
        assert(stack.length - getCallStack({ offset: 1 }).length).equals(1)
    })
})
