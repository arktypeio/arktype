<!-- {
            "kind": "assertUrl",
            "url": "https://redo.qa/",
            "id": 4
} 

import { defineConfig } from "@re-do/test"

export default defineConfig({
    customStepKinds: {
        assertUrl: async (args, { page }) => {
            const activeUrl = page.url()
            if (activeUrl !== args.url) {
                throw new Error(
                    `Url ${activeUrl} didn't match expected ${args.url}.`
                )
            }
        }
    }
}) 

-->