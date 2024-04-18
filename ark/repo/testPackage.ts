import { fromHere, shell } from "@arktype/fs"

shell(
	`pnpm vitest --config ${fromHere("vitest.config.ts")} ${process.argv
		.slice(2)
		.join(" ")}`
)
