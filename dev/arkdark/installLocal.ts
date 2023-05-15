import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"

const { name, version } = JSON.parse(readFileSync("package.json").toString())

const vsix = `${name}-${version}.vsix`

const commands = ["npx vsce package", `code --install-extension ${vsix}`]

commands.map((command) => execSync(command, { stdio: "inherit" }))
