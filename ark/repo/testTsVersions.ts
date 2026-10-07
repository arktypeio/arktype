import { exec } from "node:child_process"
import { fileURLToPath } from "node:url"

// checks against TypeScript versions other than the workspace's, each
// independent so CI can run them as separate jobs:
// pnpm testTsVersions [task...] or --list

const repoDir = fileURLToPath(new URL("../..", import.meta.url))
const ts6Tsc = "node ark/attest/node_modules/typescript-6/bin/tsc"
const useTs6 = fileURLToPath(new URL("./useTs6.ts", import.meta.url))

// minimum supported version, then the latest of each major
const consumerVersions = ["5.1.6", "5.9.3", "6.0.3", "7.0.2"]

const tasks: Record<string, string> = {
	...Object.fromEntries(
		consumerVersions.map(version => [
			`consumer@${version}`,
			// unlike npx, dlx always runs the requested version even if the
			// workspace has a copy
			`pnpm --package=typescript@${version} dlx -c "tsc --version && tsc --project ark/repo/tsCompat"`
		])
	),
	"repo@6.0.3": `${ts6Tsc} && ${ts6Tsc} --project ark/repo/tsCompat/tsconfig.attest.json`,
	// type snapshots and snap population tests' instantiation counts are
	// recorded with the workspace's TS 7, whose type strings and counts differ
	"attest@6.0.3": `cd ark/attest && NODE_OPTIONS="--import ${useTs6}" pnpm mocha --config ../repo/mocha.package.jsonc --fgrep "populates file" --invert`
}

const run = (name: string) =>
	new Promise<boolean>(resolve =>
		exec(
			tasks[name],
			{ cwd: repoDir, maxBuffer: 1e8 },
			(error, stdout, stderr) => {
				console.log(
					`${error ? "❌" : "✅"} ${name}${error ? `\n${stdout}${stderr}` : ""}`
				)
				resolve(!error)
			}
		)
	)

// for CI's matrix
if (process.argv.includes("--list")) {
	console.log(JSON.stringify(Object.keys(tasks)))
	process.exit(0)
}

const requested = process.argv.slice(2)
const unknown = requested.filter(name => !(name in tasks))
if (unknown.length) {
	console.error(
		`Unknown task(s) ${unknown.join(", ")}. Available: ${Object.keys(tasks).join(", ")}`
	)
	process.exit(1)
}

if (process.env.ARK_SKIP_TS_VERSIONS && !requested.length)
	console.log("Skipping TS version checks (ARK_SKIP_TS_VERSIONS is set)")
else {
	const names = requested.length ? requested : Object.keys(tasks)
	// concurrent dlx installs conflict, so consumer checks run one at a time
	const runConsumers = async () => {
		const results: boolean[] = []
		for (const name of names.filter(name => name.startsWith("consumer@")))
			results.push(await run(name))
		return results
	}
	const results = await Promise.all([
		runConsumers(),
		...names.filter(name => !name.startsWith("consumer@")).map(run)
	])
	if (results.flat().includes(false)) process.exit(1)
}
