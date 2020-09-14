import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t(
            [
                ["click", { selector: "'Get Started'" }],
                [
                    "set",
                    {
                        selector: "[name='email']",
                        value: "david@redo.qa"
                    }
                ],
                ["click", { selector: "'Keep me posted!'" }]
            ],
            { headless: false, slowMo: 50 }
        )
    }, 60000)
})
