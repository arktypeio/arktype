import { DisplayAs } from "redo-components"

export const objectActions: Record<string, DisplayAs> = {
    test: {
        actions: ["run", "delete"]
    },
    browserEvent: {
        actions: ["delete", "modify"]
    },
    tag: {
        actions: ["delete", "View items with this tag"]
    }
}
