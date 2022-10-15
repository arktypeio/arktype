import { assert } from "@arktype/assert"
import { test } from "mocha"
import type { UnionToTuple } from "../unionToTuple.js"

test("unionToTuple", () => {
    type PrimitiveTriad = UnionToTuple<"string" | "number" | "boolean">
    assert({} as PrimitiveTriad).typed as ["string", "number", "boolean"]
})
