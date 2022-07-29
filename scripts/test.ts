import { fromHere, shell } from "@re-/node"

const vitestBin = fromHere("..", "node_modules", "vitest", "vitest.mjs")
shell(`node ${vitestBin} run`, { cwd: fromHere("docgen") })
