import { caller } from "@re-/node"
import { registerImporter } from "./imports.js"

registerImporter(
    caller({ skip: ({ file }) => file.includes("node_modules") }).file
)

export * from "./assert.js"
