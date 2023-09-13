import { cpSync } from "node:fs"
import { join } from "node:path"
import { shell } from "@arktype/fs"

cpSync("CNAME", join("dist", "CNAME"))
shell("pnpm -w docgen")
shell("pnpm docusaurus build --out-dir dist")
