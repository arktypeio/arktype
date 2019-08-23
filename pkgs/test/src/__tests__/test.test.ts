import { test as t } from "../test"

describe("test", () => {
    test("works", async () => {
        t({
            type: "click",
            selector: ".MuiExpansionPanelSummary-expandIcon",
            value: "",
            tags: []
        })
    })
})
