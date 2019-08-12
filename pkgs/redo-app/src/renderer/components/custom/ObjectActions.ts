import { DisplayAs } from "redo-components"

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
