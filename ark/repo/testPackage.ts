import { fromHere, shell } from "@arktype/fs"

shell(
	`pnpm mocha --config ${fromHere("mocha.package.jsonc")} ${process.argv
		.slice(2)
		.join(" ")}`
)
