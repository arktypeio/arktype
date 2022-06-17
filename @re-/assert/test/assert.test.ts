import { strict } from "node:assert"
import { join } from "node:path"
import { dirName, readJson, writeJson } from "@re-/node"
import { assert } from "#src"

const n = 5
const o = { re: "do" }
const testDir = dirName()

const shouldThrow = (a: false) => {
    if (a) {
        throw new Error(`${a} is not assignable to false`)
    }
}

const throwError = () => {
    throw new Error("Test error.")
}

describe("assertions", () => {
    it("type toString", () => {
        assert(o).type.toString("{ re: string; }")
        assert(o).type.toString.is("{ re: string; }")
    })
    it("typed", () => {
        assert(o).typed as { re: string }
    })
    it("badTyped", () => {
        strict.throws(
            () => assert(o).typed as { re: number },
            strict.AssertionError,
            "number"
        )
    })
    it("equals", () => {
        assert(o).equals({ re: "do" })
    })
    it("bad equals", () => {
        strict.throws(
            () => assert(o).equals({ re: "doo" }),
            strict.AssertionError,
            "doo"
        )
    })
    it("returns", () => {
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
                    .returns.type.toString("number"),
            strict.AssertionError,
            "string"
        )
    })
    it("throws", () => {
        assert(throwError).throws(/error/g)
        strict.throws(
            // Snap should never be populated
            () => assert(() => shouldThrow(false)).throws.snap(),
            strict.AssertionError,
            "didn't throw"
        )
    })
    it("throws empty", () => {
        assert(throwError).throws()
        strict.throws(
            () => assert(() => shouldThrow(false)).throws(),
            strict.AssertionError,
            "didn't throw"
        )
    })
    it("args", () => {
        assert((input: string) => `${input}!`)
            .args("omg")
            .returns.is("omg!")
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
    it("valid type errors", () => {
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
    it("bad type errors", () => {
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
    it("TS diagnostic chain", () => {
        // @ts-expect-error
        assert(() => shouldThrow({} as {} | false)).type.errors.snap(
            `Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'.`
        )
    })
    it("chainable", () => {
        assert(o).equals({ re: "do" }).typed as { re: string }
        // @ts-expect-error
        assert(() => throwError("this is a type error"))
            .throws("Test error.")
            .type.errors("Expected 0 arguments, but got 1.")
    })
    it("bad chainable", () => {
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
    it("snap", () => {
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
            toFile: { re: "do" },
            toFileUpdate: { re: "oldValue" }
        }
    }

    it("snap toFile", () => {
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
                toFileNew: 1337
            }
        })
    })
    it("snap update toFile", () => {
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
        // @ts-ignore (using internal updateSnapshots hook)
        assert({ re: "dew" }, { updateSnapshots: true }).snap.toFile(
            "toFileUpdate"
        )
        const updatedContents = readJson(defaultSnapshotPath)
        const expectedContents = {
            "assert.test.ts": {
                ...defaultSnapshotFileContents["assert.test.ts"],
                ["toFileUpdate"]: { re: "dew" }
            }
        }
        strict.deepEqual(updatedContents, expectedContents)
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
    })

    const defaultSnapshotCustomPath = join(testDir, "custom.snapshots.json")
    const defaultSnapshotCustomFileContents = {
        "assert.test.ts": {
            toCustomFile: { re: "do" }
        }
    }

    it("snap to custom file", () => {
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
                toCustomFileNew: null
            }
        })
    })

    it("value and type snap", () => {
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

    it("error and type error snap", () => {
        // @ts-expect-error
        assert(() => shouldThrow(true))
            .throws.snap(`Error: true is not assignable to false`)
            .type.errors.snap(
                `Argument of type 'true' is not assignable to parameter of type 'false'.`
            )
        strict.throws(
            () =>
                // @ts-expect-error
                assert(() => shouldThrow(1))
                    .throws.snap(`Error: 1 is not assignable to false`)
                    .type.errors.snap(
                        `Argument of type '2' is not assignable to parameter of type 'false'.`
                    ),
            strict.AssertionError,
            "'2'"
        )
    })

    it("any type", () => {
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
    it("typedValue", () => {
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
    it("return has typed value", () => {
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
    it("throwsAndHasTypeError", () => {
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

    it("multiline", () => {
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

    it("assert value ignores type", () => {
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

    it("multiple inline snaps", () => {
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
        assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)
    })
    it("union of function chainable", () => {
        const t = {} as object | ((...args: any[]) => any)
        assert(t).equals({})
    })
    it("default serializer doesn't are about prop order", () => {
        const actual = { a: true, b: false }
        assert(actual).snap({ b: false, a: true })
    })
    it("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        assert(actual).typed as {
            b: boolean
            a: boolean
        }
    })
})
