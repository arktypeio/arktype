import { test, describe } from "mocha"
import { dirName, readJson, writeJson } from "@re-/node"
import { assert } from "../src/index.js"
import { throws, AssertionError, deepEqual } from "node:assert/strict"
import { join } from "node:path"

const n = 5
const o = { re: "do" }
const testDir = dirName()

const shouldThrow = (a: false) => {
    if (a) {
        throw new Error("true is not assignable to false")
    }
}

const throwError = () => {
    throw new Error("Test error.")
}

describe("assertions", () => {
    test("type toString", () => {
        assert(o).type.toString("{ re: string; }")
        assert(o).type.toString().is("{ re: string; }")
        assert(o).type.toString.is("{ re: string; }")
    })
    test("typed", () => {
        assert(o).typed as { re: string }
    })
    test("badTyped", () => {
        throws(
            () => assert(o).typed as { re: number },
            AssertionError,
            "number"
        )
    })
    test("equals", () => {
        assert(o).equals({ re: "do" })
    })
    test("bad equals", () => {
        throws(() => assert(o).equals({ re: "doo" }), AssertionError, "doo")
    })
    test("returns", () => {
        assert(() => null).returns(null).typed as null
        throws(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns("hi!").typed as number,
            AssertionError,
            "number"
        )
        throws(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns.type.toString()
                    .is("number"),
            AssertionError,
            "string"
        )
    })
    test("throws", () => {
        assert(throwError).throws(/error/g)
        throws(
            // Snap should never be populated
            () => assert(() => shouldThrow(false)).throws.snap(),
            AssertionError,
            "didn't throw"
        )
    })
    test("args", () => {
        assert((input: string) => `${input}!`)
            .args("omg")
            .returns()
            .is("omg!")
        throws(
            () =>
                assert((input: string) => {
                    throw new Error(`${input}!`)
                })
                    .args("fail")
                    .throws("omg!"),
            AssertionError,
            "fail"
        )
    })
    test("valid type errors", () => {
        // @ts-expect-error
        assert(o.re.length.nonexistent).type.errors(
            /Property 'nonexistent' does not exist on type 'number'/
        )
        assert(o).type.errors("")
        // @ts-expect-error
        assert(() => shouldThrow(5, "")).type.errors.is(
            "Expected 1 arguments, but got 2."
        )
    })
    test("bad type errors", () => {
        throws(
            () => assert(o).type.errors(/This error doesn't exist/),
            AssertionError,
            "doesn't exist"
        )
        throws(
            () =>
                assert(() =>
                    // @ts-expect-error
                    shouldThrow("this is a type error")
                ).type.errors.is(""),
            AssertionError,
            "not assignable"
        )
    })
    // Some TS errors as formatted as diagnostic "chains"
    // We represent them by joining the parts of the message with newlines
    test("TS diagnostic chain", () => {
        // @ts-expect-error
        assert(() => shouldThrow({} as {} | false)).type.errors.snap(
            `Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'.`
        )
    })
    test("chainable", () => {
        assert(o).equals({ re: "do" }).typed as { re: string }
        // @ts-expect-error
        assert(() => throwError("this is a type error"))
            .throws("Test error.")
            .type.errors("Expected 0 arguments, but got 1.")
    })
    test("bad chainable", () => {
        throws(
            () =>
                assert(n)
                    .equals(5)
                    .type.errors.equals("Expecting an error here will throw"),
            AssertionError,
            "Expecting an error"
        )
        throws(
            () => assert(n).is(7).type.toString("string"),
            AssertionError,
            "7"
        )
        throws(
            () => assert(() => {}).returns.is(undefined).typed as () => null,
            AssertionError,
            "null"
        )
    })
    test("snap", () => {
        assert(o).snap({ re: `do` })
        assert(o).equals({ re: "do" }).type.toString.snap(`{ re: string; }`)
        throws(() => assert(o).snap({ re: `dorf` }), AssertionError, "dorf")
    })

    const defaultSnapshotPath = join(testDir, "assert.snapshots.json")
    const defaultSnapshotFileContents = {
        "assert.test.ts": {
            toFile: "{re: `do`}",
            toFileUpdate: "{re: `oldValue`}"
        }
    }

    test("snap toFile", () => {
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
        // Check existing
        assert(o).snap.toFile("toFile")
        // Check existing fail
        throws(
            () => assert({ re: "kt" }).snap.toFile("toFile"),
            AssertionError,
            "kt"
        )
        // Add new
        assert(1337).snap.toFile("toFileNew")
        const contents = readJson(defaultSnapshotPath)
        assert(contents).equals({
            "assert.test.ts": {
                ...defaultSnapshotFileContents["assert.test.ts"],
                toFileNew: "1337"
            }
        })
    })
    test("snap update toFile", () => {
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
        // @ts-ignore (using internal updateSnapshots hook)
        assert({ re: "dew" }, { updateSnapshots: true }).snap.toFile(
            "toFileUpdate"
        )
        const updatedContents = readJson(defaultSnapshotPath)
        const expectedContents = {
            "assert.test.ts": {
                ...defaultSnapshotFileContents["assert.test.ts"],
                ["toFileUpdate"]: "{re: `dew`}"
            }
        }
        deepEqual(updatedContents, expectedContents)
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
    })

    const defaultSnapshotCustomPath = join(testDir, "custom.snapshots.json")
    const defaultSnapshotCustomFileContents = {
        "assert.test.ts": {
            toCustomFile: "{re: `do`}"
        }
    }

    test("snap to custom file", () => {
        writeJson(defaultSnapshotCustomPath, defaultSnapshotCustomFileContents)
        // Check existing
        assert(o).snap.toFile("toCustomFile", {
            path: "custom.snapshots.json"
        })
        // Check existing fail
        throws(
            () =>
                assert({ re: "kt" }).snap.toFile("toCustomFile", {
                    path: "custom.snapshots.json"
                }),
            AssertionError,
            "kt"
        )
        // Add new
        assert(null).snap.toFile("toCustomFileNew", {
            path: "custom.snapshots.json"
        })
        const contents = readJson(defaultSnapshotCustomPath)
        assert(contents).equals({
            "assert.test.ts": {
                ...defaultSnapshotCustomFileContents["assert.test.ts"],
                toCustomFileNew: "null"
            }
        })
    })

    test("value and type snap", () => {
        assert(o).snap({ re: `do` }).type.toString.snap(`{ re: string; }`)
        throws(
            () =>
                assert(o)
                    .snap({ re: `do` })
                    .type.toString.snap(`{ re: number; }`),
            AssertionError,
            "number"
        )
    })

    test("any type", () => {
        assert(n as any).typedValue(5 as any)
        assert(o as any).typed as any
        throws(() => assert(n).typedValue(5 as any), AssertionError, "number")
        throws(
            () => assert({} as unknown).typed as any,
            AssertionError,
            "unknown"
        )
    })
    test("typedValue", () => {
        const getDo = () => "do"
        assert(o).typedValue({ re: getDo() })
        throws(
            () => assert(o).typedValue({ re: "do" as any }),
            AssertionError,
            "any"
        )
        throws(
            () => assert(o).typedValue({ re: "don't" }),
            AssertionError,
            "don't"
        )
    })
    test("return has typed value", () => {
        assert(() => "ooo").returns.typedValue("ooo")
        // Wrong value
        throws(
            () =>
                assert((input: string) => input)
                    .args("yes")
                    .returns.typedValue("whoop"),
            AssertionError,
            "whoop"
        )
        // Wrong type
        throws(
            () =>
                assert((input: string) => input)
                    .args("yes")
                    .returns.typedValue("yes" as unknown),
            AssertionError,
            "unknown"
        )
    })
    test("throwsAndHasTypeError", () => {
        // @ts-expect-error
        assert(() => shouldThrow(true)).throwsAndHasTypeError(
            /true[\s\S]*not assignable[\s\S]*false/
        )
        // No thrown error
        throws(
            () =>
                // @ts-expect-error
                assert(() => shouldThrow(null)).throwsAndHasTypeError(
                    "not assignable"
                ),
            AssertionError,
            "didn't throw"
        )
        // No type error
        throws(
            () =>
                assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
                    "not assignable"
                ),
            AssertionError,
            "not assignable"
        )
    })

    test("multiline", () => {
        assert({
            several: true,
            lines: true,
            long: true
        } as object).typed as object
        throws(
            () =>
                assert({
                    several: true,
                    lines: true,
                    long: true
                }).typed as object,
            AssertionError,
            "object"
        )
    })

    test("assert value ignores type", () => {
        const myValue = { a: ["+"] } as const
        const myExpectedValue = { a: ["+"] }
        // @ts-expect-error
        assert(myValue).equals(myExpectedValue)
        assert(myValue).value.equals(myExpectedValue)
        throws(
            () => assert(myValue).value.is(myExpectedValue),
            AssertionError,
            "not reference-equal"
        )
    })

    test("multiple inline snaps", () => {
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
    })
})
