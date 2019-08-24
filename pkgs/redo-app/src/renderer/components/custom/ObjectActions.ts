import { DisplayAs } from "redo-components"
import { Test, TestInput } from "redo-model"

export const objectActions: Record<string, DisplayAs> = {
    test: {
        actions: ["run", "delete"]
    },
    steps: {
        actions: ["delete", "modify"]
    },
    tags: {
        actions: ["delete", "View items with this tag"]
    }
}

export const TestDisplay = {
    input: TestInput,
    data: Test,
    actions: ["delete", "run"],
    key: "test"
}
