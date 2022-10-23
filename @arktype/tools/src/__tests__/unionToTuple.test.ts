import { assert } from "@arktype/check"
import { test } from "mocha"
import type { UnionToTuple } from "../unionToTuple.js"

test("unionToTuple", () => {
    type PrimitiveTriad = UnionToTuple<"string" | "number" | "boolean">
    assert({} as PrimitiveTriad).typed as ["string", "number", "boolean"]
})
