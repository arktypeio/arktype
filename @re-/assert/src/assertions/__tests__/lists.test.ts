import { strict } from "node:assert"
import { test } from "vitest"
import { assert } from "../../index.js"

test("handles listComparison options", () => {
    assert([
        ["a", "b"],
        ["b", "a"]
    ]).equals(
        [
            ["b", "a"],
            ["a", "b"]
        ],
        { listComparison: "permutable" }
    )
    strict.throws(() =>
        assert([
            ["a", "removed"],
            ["b", "c"]
        ]).equals(
            [
                ["a", "added"],
                ["c", "b"]
            ],
            { listComparison: "set" }
        )
    )
})
