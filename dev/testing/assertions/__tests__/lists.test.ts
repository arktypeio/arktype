import { strict } from "node:assert"
import { test } from "mocha"
import { assert } from "../../api.js"

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
