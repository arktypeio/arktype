import { assert } from "src/assert.ts"
import { assertThrows, assertEquals } from "deno/std/testing/asserts.ts"
import { readJsonSync, writeJsonSync } from "src/common.ts"
import { dirname, join, fromFileUrl } from "deno/std/path/mod.ts"

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
    assertThrows(() => assert(o).typed as { re: number }, undefined, "number")
})
Deno.test("equals", () => {
    assert(o).equals({ re: "do" })
})
Deno.test("bad equals", () => {
    assertThrows(() => assert(o).equals({ re: "doo" }), undefined, "doo")
})
Deno.test("returns", () => {
    assert(() => null).returns(null).typed as null
    assertThrows(
        () =>
            assert((input: string) => `${input}!`)
                .args("hi")
                .returns("hi!").typed as number,
        undefined,
        "number"
    )
    assertThrows(
        () =>
            assert((input: string) => `${input}!`)
                .args("hi")
                .returns.type.toString()
                .is("number"),
        undefined,
        "string"
    )
})
Deno.test("throws", () => {
    assert(throwError).throws(/error/g)
    assertThrows(
        // Snap should never be populated
        () => assert(() => shouldThrow(false)).throws.snap(),
        undefined,
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
        undefined,
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
        undefined,
        "doesn't exist"
    )
    assertThrows(
        () =>
            // @ts-expect-error
            assert(() => shouldThrow("this is a type error")).type.errors.is(
                ""
            ),
        undefined,
        "not assignable"
    )
})
// Some TS errors as formatted as diagnostic "chains"
// We represent them by joining the parts of the message with newlines
Deno.test("TS diagnostic chain", () => {
    // @ts-expect-error
    assert(() => shouldThrow({} as {} | false)).type.errors.snap(
        `'Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'.'`
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
        undefined,
        "Expecting an error"
    )
    assertThrows(() => assert(n).is(7).type.toString("string"), undefined, "7")
    assertThrows(
        () => assert(() => {}).returns.is(undefined).typed as () => null,
        undefined,
        "null"
    )
})
Deno.test("snap", () => {
    assert(o).snap(`{re: 'do'}`)
    assert(o).equals({ re: "do" }).type.toString.snap(`'{ re: string; }'`)
    assertThrows(() => assert(o).snap(`{re: 'dorf'}`), undefined, "dorf")
})

const defaultSnapshotFile = join(testDir, "assert.snapshots.json")
const defaultSnapshotFileContents = {
    "assert.test.ts": {
        toFile: "{re: 'do'}",
        toFileUpdate: "{re: 'oldValue'}"
    }
}

Deno.test("snap toFile", () => {
    writeJsonSync(defaultSnapshotFile, defaultSnapshotFileContents)
    assert(o).snap.toFile("toFile")
    assertThrows(
        () => assert({ re: "kt" }).snap.toFile("toFile"),
        undefined,
        "kt"
    )
    const contentsAfterSnap = readJsonSync(defaultSnapshotFile)
    assertEquals(defaultSnapshotFileContents, contentsAfterSnap)
})
Deno.test("snap update toFile", () => {
    writeJsonSync(defaultSnapshotFile, defaultSnapshotFileContents)
    // @ts-ignore (using internal updateSnapshots hook)
    assert({ re: "dew" }, { updateSnapshots: true }).snap.toFile("toFileUpdate")
    const updatedContents = readJsonSync(defaultSnapshotFile)
    const expectedContents = {
        "assert.test.ts": {
            ...defaultSnapshotFileContents["assert.test.ts"],
            ["toFileUpdate"]: "{re: 'dew'}"
        }
    }
    assertEquals(updatedContents, expectedContents)
    writeJsonSync(defaultSnapshotFile, defaultSnapshotFileContents)
})
Deno.test("snap to custom file", () => {
    assert(o).snap.toFile("toCustomFile", {
        path: "custom.snapshots.json"
    })
    const contents = readJsonSync(join(testDir, "custom.snapshots.json"))
    assert(contents).equals({
        "assert.test.ts": {
            toCustomFile: "{re: 'do'}"
        }
    })
})
Deno.test("any type", () => {
    assert(n as any).typedValue(5 as any)
    assert(o as any).typed as any
    assertThrows(() => assert(n).typedValue(5 as any), undefined, "number")
    assertThrows(() => assert({} as unknown).typed as any, undefined, "unknown")
})
Deno.test("typedValue", () => {
    const getDo = () => "do"
    assert(o).typedValue({ re: getDo() })
    assertThrows(
        () => assert(o).typedValue({ re: "do" as any }),
        undefined,
        "any"
    )
    assertThrows(
        () => assert(o).typedValue({ re: "don't" }),
        undefined,
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
        undefined,
        "whoop"
    )
    // Wrong type
    assertThrows(
        () =>
            assert((input: string) => input)
                .args("yes")
                .returns.typedValue("yes" as unknown),
        undefined,
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
        undefined,
        "didn't throw"
    )
    // No type error
    assertThrows(
        () =>
            assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
                "not assignable"
            ),
        undefined,
        "not assignable"
    )
})
