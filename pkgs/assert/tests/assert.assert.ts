import { assert } from "../src/index.ts"
import { assertEquals, assertThrows } from "@deno/testing"

export const f = {}

const n: number = 5
const o = { re: "do" }

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
        "() => shouldThrow(false) didn't throw."
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
// Deno.test("bad chainable", () => {
//     expect(() =>
//         assert(n)
//             .equals(5)
//             .type.errors.equals("Expecting an error here will throw")
//     ).toThrow("Expecting an error")
//     expect(() => assert(n).is(7).type.toString("string")).toThrow("7")
//     expect(
//         () => assert(() => {}).returns.is(undefined).typed as () => null
//     ).toThrow("null")
// })
// Deno.test("snap", () => {
//     // You can delete the snapshot and it will be re-generated,
//     // but not going to bother to write a test for that yet
//     // since it's just calling jest's snapshot functionality
//     assert(o).snap(`
//             {
//               "re": "do",
//             }
//         `)
//     assert(o).equals({ re: "do" }).type.toString.snap(`"{ re: string; }"`)
//     assert(o).snap.toFile()
// })
// Deno.test("any type", () => {
//     assert(n as any).typedValue(5 as any)
//     assert(o as any).typed as any
//     expect(() => assert(n).typedValue(5 as any)).toThrow(/any[\s\S]*number/g)
//     expect(() => assert({} as unknown).typed as any).toThrow(
//         /any[\s\S]*unknown/g
//     )
// })
// Deno.test("typedValue", () => {
//     const getDo = () => "do"
//     assert(o).typedValue({ re: getDo() })
//     expect(() => assert(o).typedValue({ re: "do" as any })).toThrow("any")
//     expect(() => assert(o).typedValue({ re: "don't" })).toThrow("don't")
// })
// Deno.test("return has typed value", () => {
//     assert(() => "ooo").returns.typedValue("ooo")
//     // Wrong value
//     expect(() =>
//         assert((input: string) => input)
//             .args("yes")
//             .returns.typedValue("whoop")
//     ).toThrow("whoop")
//     // Wrong type
//     expect(() =>
//         assert((input: string) => input)
//             .args("yes")
//             .returns.typedValue("yes" as unknown)
//     ).toThrow("unknown")
// })
// Deno.test("throwsAndHasTypeError", () => {
//     // @ts-expect-error
//     assert(() => shouldThrow(true)).throwsAndHasTypeError(
//         /true[\s\S]*not assignable[\s\S]*false/
//     )
//     // No thrown error
//     expect(() =>
//         // @ts-expect-error
//         assert(() => shouldThrow(null)).throwsAndHasTypeError("not assignable")
//     ).toThrow("didn't throw")
//     // No type error
//     expect(() =>
//         assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
//             "not assignable"
//         )
//     ).toThrow(/Received[\s\S]*""/g)
// })
// Deno.test("sourcemap issues", () => {
//     // Running this test with ts-node results in the wrong sourcemap,
//     // where .typed's call position is wrong and potentially nonexistent
//     // prettier-ignore
//     assert(n)
//             .is(5)
//             .typed as number
//     // prettier-ignore
//     assert((a: number, b: number) => a + b)
//             .args(1, 2)
//             .returns
//             .typedValue(3 as number)
// })
