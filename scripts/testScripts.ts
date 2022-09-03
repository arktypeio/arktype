import { dirName, shell } from "@re-/node"

shell("mocha **/*.test.ts", { cwd: dirName() })
