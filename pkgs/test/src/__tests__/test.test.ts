import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t(
            [
                { kind: "click", selector: "'Get Started'" },
                {
                    kind: "set",
                    selector: "[name='email']",
                    value: "david@redo.qa"
                },
                { kind: "click", selector: "'Keep me posted!'" }
            ],
            { headless: false, slowMo: 50 }
        )
    }, 60000)
})
