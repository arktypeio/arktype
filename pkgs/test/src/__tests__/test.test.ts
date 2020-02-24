import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t([
            [
                "set",
                {
                    selector: "[name='email']",
                    value: "david@redo.qa"
                }
            ],
            ["click", { selector: ".MuiButton-label" }]
        ])
    }, 60000)
})
