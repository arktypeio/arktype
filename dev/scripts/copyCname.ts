import { cpSync } from "node:fs"
import { join } from "node:path"
import { fromHere } from "../attest/main.js"

const arktypeio = fromHere("..", "arktype.io")
const CNAME = join(arktypeio, "CNAME")
const distCNAME = join(arktypeio, "dist", "CNAME")
cpSync(CNAME, distCNAME)
