import { fromHere, shell } from "@re-/node"

const mochaBin = fromHere("..", "node_modules", "mocha", "mocha.js")
shell(`node ${mochaBin}`, { cwd: fromHere("docgen") })
