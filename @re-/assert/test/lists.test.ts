import { strict } from "node:assert"
import { assert } from "../src/index.js"

it("handles listComparison options", () => {
    assert([
        ["a", "b"],
        ["b", "a"]
    ]).equals(
        [
            ["b", "a"],
            ["a", "b"]
        ],
        { listComparison: "deepUnordered" }
    )
    strict.throws(
        () =>
            assert([
                ["a", "removed"],
                ["b", "c"]
            ]).equals(
                [
                    ["a", "added"],
                    ["c", "b"]
                ],
                { listComparison: "deepSets" }
            ),
        {
            name: "AssertionError",
            message: `{added: [["a", "removed"]], removed: [["a", "added"]]}`
        }
    )
})
