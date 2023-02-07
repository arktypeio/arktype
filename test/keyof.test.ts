import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeImplicitNeverMessage } from "../src/parse/string/ast.ts"
import { Path } from "../src/utils/paths.ts"

describe("keyof", () => {
    it("object literal", () => {
        const t = type(["keyof", { a: "123", b: "123" }])
        attest(t.infer).typed as "a" | "b"
        attest(t.node).snap({ string: [{ value: "a" }, { value: "b" }] })
    })
    it("overlapping union", () => {
        const t = type([
            "keyof",
            [{ a: "number", b: "boolean" }, "|", { b: "number", c: "string" }]
        ])
        attest(t.infer).typed as "b"
        attest(t.node).snap({ string: [{ value: "b" }] })
    })
    const expectedNeverKeyOfMessage = writeImplicitNeverMessage(
        new Path(),
        "keyof"
    )
    it("non-overlapping union", () => {
        attest(() =>
            // @ts-expect-error
            type(["keyof", [{ a: "number" }, "|", { b: "number" }]])
        ).throwsAndHasTypeError(expectedNeverKeyOfMessage)
    })
    it("non-object", () => {
        // @ts-expect-error
        attest(() => type(["keyof", "string"])).throwsAndHasTypeError(
            expectedNeverKeyOfMessage
        )
    })
    it("union including non-object", () => {
        attest(() =>
            // @ts-expect-error
            type(["keyof", [{ a: "number" }, "|", "string"]])
        ).throwsAndHasTypeError(expectedNeverKeyOfMessage)
    })
    it("tuple", () => {
        const t = type(["keyof", ["string", "number"]])
        attest(t.infer).typed as "0" | "1"
        attest(t.node).snap({ string: [{ value: "0" }, { value: "1" }] })
    })
    it("array", () => {
        // conservatively inferred as never pending https://github.com/arktypeio/arktype/issues/605
        attest(() =>
            // @ts-expect-error
            type(["keyof", "unknown[]"])
        ).throwsAndHasTypeError(expectedNeverKeyOfMessage)
    })
})
