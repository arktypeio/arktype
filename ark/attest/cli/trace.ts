import { execSync } from "child_process"
import { existsSync } from "fs"
import { join } from "path"
import { baseDiagnosticTscCmd } from "./shared.js"

export const trace = async (args: string[]): Promise<void> => {
	const packageDir = args[0] ?? process.cwd()

	if (!existsSync(packageDir)) {
		throw new Error(
			`trace requires an argument for an existing directory to trace, e.g. 'pnpm attest trace packages/api'`
		)
	}

	try {
		console.log(`⏳ Gathering type trace data for ${packageDir}...`)
		// These cache files have to be removed before any analysis is done otherwise
		// the results will be meaningless.
		// the .tstrace directory will contain a trace.json file and a types.json file.
		// the trace.json file can be viewed via a tool like https://ui.perfetto.dev/
		// the types.json file can be used to associate IDs from the trace file with type aliases
		execSync(`${baseDiagnosticTscCmd} --generateTrace .tstrace`, {
			cwd: packageDir,
			stdio: "inherit"
		})
	} catch (e) {
		console.error(String(e))
	} finally {
		console.log(`⏳ Analyzing type trace data for ${packageDir}...`)
		// allow analyze-trace to process the args
		process.argv = [
			"node",
			"node_modules/@typescript/analyze-trace/dist/analyze-trace-dir.js",
			join(packageDir, ".tstrace")
		]
		// TypeScript's analyze-trace tool can be used to automatically detect hot-spots in your code.
		// It's not a perfect match for what can be optimized, but it can be a helpful place to start
		await import("@typescript/analyze-trace/dist/analyze-trace-dir.js")
	}
}
