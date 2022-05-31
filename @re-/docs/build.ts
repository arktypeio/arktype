import { fromHere, shell } from "@re-/node"
import { writeFileSync } from "fs"

shell("docusaurus build --out-dir dist")
writeFileSync(fromHere("dist", "CNAME"), "redo.dev")
