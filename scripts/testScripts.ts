import { dirName, shell } from "@arktype/node"

shell("mocha **/*.test.ts", { cwd: dirName() })
