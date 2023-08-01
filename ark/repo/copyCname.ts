import { cpSync } from "node:fs"
import { join } from "node:path"
import { fromHere } from "@arktype/test"

const arktypeio = fromHere("..", "docs")
const CNAME = join(arktypeio, "CNAME")
const distCNAME = join(arktypeio, "dist", "CNAME")
cpSync(CNAME, distCNAME)
