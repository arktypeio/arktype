import { writeFileSync } from "node:fs"
import { fromHere, shell } from "@re-/node"

shell("docusaurus build --out-dir dist")
writeFileSync(fromHere("dist", "CNAME"), "redo.dev")
