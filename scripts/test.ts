import { fromHere, shell } from "@re-/node"

const mochaBin = fromHere("..", "node_modules", "mocha", "bin", "mocha.js")
shell(`node ${mochaBin}`, { cwd: fromHere("docgen") })
