import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t(
            [
                "set",
                {
                    selector: { css: "[name='email']" },
                    value: "awesome@burba.com"
                }
            ],
            ["click", { selector: { css: ".MuiButton-label" } }]
        )
    }, 60000)
})
