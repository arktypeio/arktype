import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t(
            [
                "set",
                {
                    selector: { css: "[name='email']" },
                    value: "david@redo.qa"
                }
            ],
            ["click", { selector: { css: ".MuiButton-label" } }]
        )
    }, 60000)
})
