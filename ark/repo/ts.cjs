const { execSync } = require("node:child_process")

const fileArgIndex = process.argv.findIndex((arg) => arg.endsWith("/ts.cjs"))

if (fileArgIndex === process.argv.length - 1) {
	throw new Error(
		"ts expects at least one argument (e.g. pnpm ts ./myScript.ts)"
	)
}

execSync(
	`node --import=tsx --require=tsconfig-paths/register --no-warnings=ExperimentalWarning ${process.argv
		.slice(fileArgIndex + 1)
		.join(" ")}`,
	{
		stdio: "inherit"
	}
)
