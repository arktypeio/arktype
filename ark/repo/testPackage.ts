import { fromHere, shell } from "@ark/fs"

shell("pnpm", [
	"mocha",
	"--config",
	fromHere("mocha.package.jsonc"),
	process.argv.slice(2).join(" ")
])
