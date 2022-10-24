import { test } from "mocha"
import type { UnionToTuple } from "../unionToTuple.js"
import { assert } from "#testing"

test("unionToTuple", () => {
    type PrimitiveTriad = UnionToTuple<"string" | "number" | "boolean">
    assert({} as PrimitiveTriad).typed as ["string", "number", "boolean"]
})
