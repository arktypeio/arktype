import {
    assertThrows,
    assertEquals,
    AssertionError
} from "@deno/std/testing/asserts.ts"
import { dirname, join, fromFileUrl } from "@deno/std/path/mod.ts"
import { assert } from "@src/assert.ts"
import { readJsonSync, writeJsonSync } from "@src/common.ts"

const n: number = 5
const o = { re: "do" }
const testDir = dirname(fromFileUrl(import.meta.url))

const shouldThrow = (a: false) => {
    if (a) {
        throw new Error("true is not assignable to false")
    }
}

const throwError = () => {
    throw new Error("Test error.")
}

Deno.test("type toString", () => {
    assert(o).type.toString("{ re: string; }")
    assert(o).type.toString().is("{ re: string; }")
    assert(o).type.toString.is("{ re: string; }")
})
Deno.test("typed", () => {
    assert(o).typed as { re: string }
})
Deno.test("badTyped", () => {
    assertThrows(
        () => assert(o).typed as { re: number },
        AssertionError,
        "number"
    )
})
Deno.test("equals", () => {
    assert(o).equals({ re: "do" })
})
Deno.test("bad equals", () => {
    assertThrows(() => assert(o).equals({ re: "doo" }), AssertionError, "doo")
})
Deno.test("returns", () => {
    assert(() => null).returns(null).typed as null
    assertThrows(
        () =>
            assert((input: string) => `${input}!`)
                .args("hi")
                .returns("hi!").typed as number,
        AssertionError,
        "number"
    )
    assertThrows(
        () =>
            assert((input: string) => `${input}!`)
                .args("hi")
                .returns.type.toString()
                .is("number"),
        AssertionError,
        "string"
    )
})
Deno.test("throws", () => {
    assert(throwError).throws(/error/g)
    assertThrows(
        // Snap should never be populated
        () => assert(() => shouldThrow(false)).throws.snap(),
        AssertionError,
        "didn't throw"
    )
})
Deno.test("args", () => {
    assert((input: string) => `${input}!`)
        .args("omg")
        .returns()
        .is("omg!")
    assertThrows(
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
Deno.test("valid type errors", () => {
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
Deno.test("bad type errors", () => {
    assertThrows(
        () => assert(o).type.errors(/This error doesn't exist/),
        AssertionError,
        "doesn't exist"
    )
    assertThrows(
        () =>
            // @ts-expect-error
            assert(() => shouldThrow("this is a type error")).type.errors.is(
                ""
            ),
        AssertionError,
        "not assignable"
    )
})
// Some TS errors as formatted as diagnostic "chains"
// We represent them by joining the parts of the message with newlines
Deno.test("TS diagnostic chain", () => {
    // @ts-expect-error
    assert(() => shouldThrow({} as {} | false)).type.errors.snap(
        `"Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'."`
    )
})
Deno.test("chainable", () => {
    assert(o).equals({ re: "do" }).typed as { re: string }
    // @ts-expect-error
    assert(() => throwError("this is a type error"))
        .throws("Test error.")
        .type.errors("Expected 0 arguments, but got 1.")
})
Deno.test("bad chainable", () => {
    assertThrows(
        () =>
            assert(n)
                .equals(5)
                .type.errors.equals("Expecting an error here will throw"),
        AssertionError,
        "Expecting an error"
    )
    assertThrows(
        () => assert(n).is(7).type.toString("string"),
        AssertionError,
        "7"
    )
    assertThrows(
        () => assert(() => {}).returns.is(undefined).typed as () => null,
        AssertionError,
        "null"
    )
})
Deno.test("snap", () => {
    assert(o).snap(`{re: "do"}`)
    assert(o).equals({ re: "do" }).type.toString.snap(`"{ re: string; }"`)
    assertThrows(() => assert(o).snap(`{re: "dorf"}`), AssertionError, "dorf")
})

const defaultSnapshotPath = join(testDir, "assert.snapshots.json")
const defaultSnapshotFileContents = {
    "assert.test.ts": {
        toFile: '{re: "do"}',
        toFileUpdate: '{re: "oldValue"}'
    }
}

Deno.test("snap toFile", () => {
    writeJsonSync(defaultSnapshotPath, defaultSnapshotFileContents)
    // Check existing
    assert(o).snap.toFile("toFile")
    // Check existing fail
    assertThrows(
        () => assert({ re: "kt" }).snap.toFile("toFile"),
        AssertionError,
        "kt"
    )
    // Add new
    assert(1337).snap.toFile("toFileNew")
    const contents = readJsonSync(defaultSnapshotPath)
    assert(contents).equals({
        "assert.test.ts": {
            ...defaultSnapshotFileContents["assert.test.ts"],
            toFileNew: "1337"
        }
    })
})
Deno.test("snap update toFile", () => {
    writeJsonSync(defaultSnapshotPath, defaultSnapshotFileContents)
    // @ts-ignore (using internal updateSnapshots hook)
    assert({ re: "dew" }, { updateSnapshots: true }).snap.toFile("toFileUpdate")
    const updatedContents = readJsonSync(defaultSnapshotPath)
    const expectedContents = {
        "assert.test.ts": {
            ...defaultSnapshotFileContents["assert.test.ts"],
            ["toFileUpdate"]: '{re: "dew"}'
        }
    }
    assertEquals(updatedContents, expectedContents)
    writeJsonSync(defaultSnapshotPath, defaultSnapshotFileContents)
})

const defaultSnapshotCustomPath = join(testDir, "custom.snapshots.json")
const defaultSnapshotCustomFileContents = {
    "assert.test.ts": {
        toCustomFile: '{re: "do"}'
    }
}

Deno.test("snap to custom file", () => {
    writeJsonSync(defaultSnapshotCustomPath, defaultSnapshotCustomFileContents)
    // Check existing
    assert(o).snap.toFile("toCustomFile", {
        path: "custom.snapshots.json"
    })
    // Check existing fail
    assertThrows(
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
    const contents = readJsonSync(defaultSnapshotCustomPath)
    assert(contents).equals({
        "assert.test.ts": {
            ...defaultSnapshotCustomFileContents["assert.test.ts"],
            toCustomFileNew: "null"
        }
    })
})

Deno.test("value and type snap", () => {
    assert(o).snap(`{re: "do"}`).type.toString.snap()
    assertThrows(
        () => assert(o).snap().type.toString.snap(`"{ re: number; }"`),
        AssertionError,
        "number"
    )
})

Deno.test("any type", () => {
    assert(n as any).typedValue(5 as any)
    assert(o as any).typed as any
    assertThrows(() => assert(n).typedValue(5 as any), AssertionError, "number")
    assertThrows(
        () => assert({} as unknown).typed as any,
        AssertionError,
        "unknown"
    )
})
Deno.test("typedValue", () => {
    const getDo = () => "do"
    assert(o).typedValue({ re: getDo() })
    assertThrows(
        () => assert(o).typedValue({ re: "do" as any }),
        AssertionError,
        "any"
    )
    assertThrows(
        () => assert(o).typedValue({ re: "don't" }),
        AssertionError,
        "don't"
    )
})
Deno.test("return has typed value", () => {
    assert(() => "ooo").returns.typedValue("ooo")
    // Wrong value
    assertThrows(
        () =>
            assert((input: string) => input)
                .args("yes")
                .returns.typedValue("whoop"),
        AssertionError,
        "whoop"
    )
    // Wrong type
    assertThrows(
        () =>
            assert((input: string) => input)
                .args("yes")
                .returns.typedValue("yes" as unknown),
        AssertionError,
        "unknown"
    )
})
Deno.test("throwsAndHasTypeError", () => {
    // @ts-expect-error
    assert(() => shouldThrow(true)).throwsAndHasTypeError(
        /true[\s\S]*not assignable[\s\S]*false/
    )
    // No thrown error
    assertThrows(
        () =>
            // @ts-expect-error
            assert(() => shouldThrow(null)).throwsAndHasTypeError(
                "not assignable"
            ),
        AssertionError,
        "didn't throw"
    )
    // No type error
    assertThrows(
        () =>
            assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
                "not assignable"
            ),
        AssertionError,
        "not assignable"
    )
})
