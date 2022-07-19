import { fromHere, shell } from "@re-/node"

const mochaBin = fromHere("..", "node_modules", "mocha", "bin", "mocha.js")
shell(mochaBin, { cwd: fromHere("docgen") })
