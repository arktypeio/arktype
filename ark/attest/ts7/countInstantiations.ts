import { execFile } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { availableParallelism } from "node:os"
import { basename } from "node:path"

// run as a script so tsc processes can run in parallel from sync callers:
// node countInstantiations.ts <tscPath>
// reads { files: Record<path, contents>, configPaths: string[] } from stdin,
// writes the files and then a JSON array with one { count, errorLines } per
// tsconfig, where errorLines are the lines of errors reported in its root file

type Input = {
	files: Record<string, string>
	configPaths: string[]
}

const tscPath = process.argv[2]
const { files, configPaths }: Input = JSON.parse(readFileSync(0, "utf8"))

// this process owns the files so they're removed even if a run is
// interrupted, which would otherwise end its parent without cleanup
process.on("exit", () => {
	for (const path in files) rmSync(path, { force: true })
})
for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.on(signal, () => process.exit(1))

for (const [path, contents] of Object.entries(files))
	writeFileSync(path, contents)

type Result = { count: number; errorLines: number[] }

const countInstantiations = (configPath: string) =>
	new Promise<Result>((resolve, reject) =>
		execFile(
			process.execPath,
			[
				tscPath,
				"--project",
				configPath,
				"--noEmit",
				"--extendedDiagnostics",
				// parallel checkers each instantiate their own copies of types
				"--singleThreaded"
			],
			{ maxBuffer: 1e8 },
			// tsc exits non-zero for type errors, which don't affect the count,
			// but skips checking entirely for errors like syntax errors or
			// invalid options, which it reports by omitting the check time
			(_, stdout, stderr) => {
				const count = /Instantiations:\s+(\d+)/.exec(stdout)?.[1]
				if (count === undefined || !stdout.includes("Check time:")) {
					reject(
						new Error(
							`Unable to read instantiations for ${configPath}:\n${stdout}${stderr}`
						)
					)
				} else {
					resolve({
						count: Number(count),
						errorLines: getErrorLines(stdout, configPath)
					})
				}
			}
		)
	)

const getErrorLines = (stdout: string, configPath: string): number[] => {
	const rootFile = basename(JSON.parse(files[configPath]).files[0])
	const lines: number[] = []
	for (const line of stdout.split("\n")) {
		const location = /^(.+)\((\d+),\d+\): error TS/.exec(line)
		if (location && basename(location[1]) === rootFile)
			lines.push(Number(location[2]))
	}
	return lines
}

const counts: Result[] = Array.from({ length: configPaths.length })
let next = 0
const worker = async () => {
	while (next < configPaths.length) {
		const i = next++
		counts[i] = await countInstantiations(configPaths[i])
	}
}

void Promise.all(
	Array.from(
		{ length: Math.min(availableParallelism(), configPaths.length) },
		worker
	)
).then(() => process.stdout.write(JSON.stringify(counts)))
