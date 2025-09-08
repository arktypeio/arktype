import { execSync } from "node:child_process"
import { baseDiagnosticTscCmd } from "./shared.ts"

export const stats = (args: string[]): void => {
	const packageDirs = args.length ? args : [process.cwd()]
	const listedStats = packageDirs.map((packageDir): TypePerfStats => {
		console.log(`⏳ Gathering type perf data for ${packageDir}...`)
		let output: string
		try {
			output = execSync(baseDiagnosticTscCmd, {
				cwd: packageDir,
				stdio: "pipe"
			}).toString()
		} catch (e: any) {
			output = e.stdout?.toString() ?? ""
			output += e.stderr?.toString() ?? ""
			console.error(
				`❗Encountered one or more errors checking types for ${packageDir}- results may be inaccurate❗`
			)
		}
		const stats = parseTsDiagnosticsOutput(output)
		logTypePerfStats(stats)
		return stats
	})

	const aggregatedStats = listedStats.reduce<TypePerfStats>(
		(aggregatedStats, packageStats) => ({
			checkTime: aggregatedStats.checkTime + packageStats.checkTime,
			types: aggregatedStats.types + packageStats.types,
			instantiations:
				aggregatedStats.instantiations + packageStats.instantiations
		}),
		{
			checkTime: 0,
			types: 0,
			instantiations: 0
		}
	)

	console.log("📊 aggregated type performance:")
	logTypePerfStats(aggregatedStats)
}

type TypePerfStats = {
	checkTime: number
	types: number
	instantiations: number
}

const parseTsDiagnosticsOutput = (output: string): TypePerfStats => {
	const lines = output.split("\n")
	const results: TypePerfStats = {
		checkTime: 0,
		types: 0,
		instantiations: 0
	}

	for (const line of lines) {
		if (line.startsWith("Check time:"))
			results.checkTime = parseFloat(line.split(":")[1].trim())
		else if (line.startsWith("Types:"))
			results.types = parseInt(line.split(":")[1].trim(), 10)
		else if (line.startsWith("Instantiations:"))
			results.instantiations = parseInt(line.split(":")[1].trim(), 10)
	}
	return results
}

const logTypePerfStats = (stats: TypePerfStats) => {
	console.log(JSON.stringify(stats, null, 4))
}
