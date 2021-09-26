import { compile } from ".."
import { InvalidTypeDefError } from "../validate"
import { expectType, expectError } from "tsd"

describe("compile", () => {
    test("single", () => {
        expectType<string>(compile({ a: "string" }).types.a)
        expectError<"Unable to parse the type of 'strig'.">(
            // @ts-expect-error
            compile({ a: "strig" }).types.a
        )
    })
    test("multiple independent", () => {
        expectType<boolean>(
            compile({ a: "string" }, { b: { c: "boolean" } }).types.b.c
        )
        expectError<"Unable to parse the type of 'uhoh'.">(
            // @ts-expect-error
            compile({ a: "string" }, { b: { c: "uhoh" } }).types.b.c
        )
    })
})
