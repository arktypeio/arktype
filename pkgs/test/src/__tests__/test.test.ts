import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        await t({
            type: "click",
            selector: ".MuiButton-label",
            value: "",
            tags: []
        })
    }, 60000)
})
