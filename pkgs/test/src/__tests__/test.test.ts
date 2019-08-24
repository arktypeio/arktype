import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t(
            ["click", { selector: { css: ".MuiButton-label" } }],
            [
                "set",
                {
                    selector: { css: "[name='email']" },
                    value: "awesome@burba.com"
                }
            ]
        )
    }, 60000)
})
