import { execSync } from "child_process"
import { readdirSync, rmSync } from "fs"
import { join } from "path"

const rootPackagesDir = join(process.cwd(), "packages")
// collect all packages from the packages and external dirs
const packageDirs = readdirSync(rootPackagesDir).flatMap((name) =>
	name === "external"
		? readdirSync(join(rootPackagesDir, "external")).map((externalName) =>
				join("external", externalName)
		  )
		: name
)

const listedStats = packageDirs.map((packageName): TypePerfStats => {
	console.log(`⏳ Gathering type perf data for ${packageName}...`)
	const packageDir = join(rootPackagesDir, packageName)
	let output: string
	try {
		rmSync(join(packageDir, "tsconfig.tsbuildinfo"), { force: true })
		// this was set as a custom location for tsbuildinfo in packages/api
		rmSync(join(packageDir, "node_modules", ".cache", "tsbuildinfo.json"), {
			force: true
		})
		output = execSync("pnpm tsc --noEmit --extendedDiagnostics", {
			cwd: packageDir,
			stdio: "pipe"
		}).toString()
	} catch (e: any) {
		output = e.stdout?.toString() ?? ""
		output += e.stderr?.toString() ?? ""
		console.error(
			`❗Encountered one or more errors checking types for ${packageName}- results may be inaccurate❗`
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
		instantiations: aggregatedStats.instantiations + packageStats.instantiations
	}),
	{
		checkTime: 0,
		types: 0,
		instantiations: 0
	}
)

const logTypePerfStats = (stats: TypePerfStats) => {
	console.log(JSON.stringify(stats, null, 4))
}

console.log("📊 aggregated type performance:")
logTypePerfStats(aggregatedStats)

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
		if (line.startsWith("Check time:")) {
			results.checkTime = parseFloat(line.split(":")[1].trim())
		} else if (line.startsWith("Types:")) {
			results.types = parseInt(line.split(":")[1].trim(), 10)
		} else if (line.startsWith("Instantiations:")) {
			results.instantiations = parseInt(line.split(":")[1].trim(), 10)
		}
	}
	return results
}
