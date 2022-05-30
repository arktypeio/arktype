import { strict } from "node:assert"
import { join } from "node:path"
import { dirName, readJson, writeJson } from "@re-/node"
import { describe, test } from "mocha"
import { assert } from "../index.js"

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
        strict.throws(
            () => assert(o).typed as { re: number },
            strict.AssertionError,
            "number"
        )
    })
    test("equals", () => {
        assert(o).equals({ re: "do" })
    })
    test("bad equals", () => {
        strict.throws(
            () => assert(o).equals({ re: "doo" }),
            strict.AssertionError,
            "doo"
        )
    })
    test("returns", () => {
        assert(() => null).returns(null).typed as null
        strict.throws(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns("hi!").typed as number,
            strict.AssertionError,
            "number"
        )
        strict.throws(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns.type.toString()
                    .is("number"),
            strict.AssertionError,
            "string"
        )
    })
    test("throws", () => {
        assert(throwError).throws(/error/g)
        strict.throws(
            // Snap should never be populated
            () => assert(() => shouldThrow(false)).throws.snap(),
            strict.AssertionError,
            "didn't throw"
        )
    })
    test("args", () => {
        assert((input: string) => `${input}!`)
            .args("omg")
            .returns()
            .is("omg!")
        strict.throws(
            () =>
                assert((input: string) => {
                    throw new Error(`${input}!`)
                })
                    .args("fail")
                    .throws("omg!"),
            strict.AssertionError,
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
        strict.throws(
            () => assert(o).type.errors(/This error doesn't exist/),
            strict.AssertionError,
            "doesn't exist"
        )
        strict.throws(
            () =>
                assert(() =>
                    // @ts-expect-error
                    shouldThrow("this is a type error")
                ).type.errors.is(""),
            strict.AssertionError,
            "not assignable"
        )
    })
    /*
     * Some TS errors as formatted as diagnostic "chains"
     * We represent them by joining the parts of the message with newlines
     */
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
        strict.throws(
            () =>
                assert(n)
                    .equals(5)
                    .type.errors.equals("Expecting an error here will throw"),
            strict.AssertionError,
            "Expecting an error"
        )
        strict.throws(
            () => assert(n).is(7).type.toString("string"),
            strict.AssertionError,
            "7"
        )
        strict.throws(
            () => assert(() => {}).returns.is(undefined).typed as () => null,
            strict.AssertionError,
            "null"
        )
    })
    test("snap", () => {
        assert(o).snap({ re: `do` })
        assert(o).equals({ re: "do" }).type.toString.snap(`{ re: string; }`)
        strict.throws(
            () => assert(o).snap({ re: `dorf` }),
            strict.AssertionError,
            "dorf"
        )
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
        strict.throws(
            () => assert({ re: "kt" }).snap.toFile("toFile"),
            strict.AssertionError,
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
        strict.deepEqual(updatedContents, expectedContents)
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
        strict.throws(
            () =>
                assert({ re: "kt" }).snap.toFile("toCustomFile", {
                    path: "custom.snapshots.json"
                }),
            strict.AssertionError,
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
        strict.throws(
            () =>
                assert(o)
                    .snap({ re: `do` })
                    .type.toString.snap(`{ re: number; }`),
            strict.AssertionError,
            "number"
        )
    })

    test("any type", () => {
        assert(n as any).typedValue(5 as any)
        assert(o as any).typed as any
        strict.throws(
            () => assert(n).typedValue(5 as any),
            strict.AssertionError,
            "number"
        )
        strict.throws(
            () => assert({} as unknown).typed as any,
            strict.AssertionError,
            "unknown"
        )
    })
    test("typedValue", () => {
        const getDo = () => "do"
        assert(o).typedValue({ re: getDo() })
        strict.throws(
            () => assert(o).typedValue({ re: "do" as any }),
            strict.AssertionError,
            "any"
        )
        strict.throws(
            () => assert(o).typedValue({ re: "don't" }),
            strict.AssertionError,
            "don't"
        )
    })
    test("return has typed value", () => {
        assert(() => "ooo").returns.typedValue("ooo")
        // Wrong value
        strict.throws(
            () =>
                assert((input: string) => input)
                    .args("yes")
                    .returns.typedValue("whoop"),
            strict.AssertionError,
            "whoop"
        )
        // Wrong type
        strict.throws(
            () =>
                assert((input: string) => input)
                    .args("yes")
                    .returns.typedValue("yes" as unknown),
            strict.AssertionError,
            "unknown"
        )
    })
    test("throwsAndHasTypeError", () => {
        // @ts-expect-error
        assert(() => shouldThrow(true)).throwsAndHasTypeError(
            /true[\S\s]*not assignable[\S\s]*false/
        )
        // No thrown error
        strict.throws(
            () =>
                // @ts-expect-error
                assert(() => shouldThrow(null)).throwsAndHasTypeError(
                    "not assignable"
                ),
            strict.AssertionError,
            "didn't throw"
        )
        // No type error
        strict.throws(
            () =>
                assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
                    "not assignable"
                ),
            strict.AssertionError,
            "not assignable"
        )
    })

    test("multiline", () => {
        assert({
            several: true,
            lines: true,
            long: true
        } as object).typed as object
        strict.throws(
            () =>
                assert({
                    several: true,
                    lines: true,
                    long: true
                }).typed as object,
            strict.AssertionError,
            "object"
        )
    })

    test("assert value ignores type", () => {
        const myValue = { a: ["+"] } as const
        const myExpectedValue = { a: ["+"] }
        // @ts-expect-error
        assert(myValue).equals(myExpectedValue)
        assert(myValue).value.equals(myExpectedValue)
        strict.throws(
            () => assert(myValue).value.is(myExpectedValue),
            strict.AssertionError,
            "not reference-equal"
        )
    })

    test("multiple inline snaps", () => {
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
    })
    test("union of function chainable", () => {
        const t = {} as object | ((...args: any[]) => any)
        assert(t).equals({})
    })
})
