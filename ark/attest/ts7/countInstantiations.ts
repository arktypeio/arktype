import { execFile } from "node:child_process"
import { availableParallelism } from "node:os"

// run as a script so tsc processes can run in parallel from sync callers:
// node countInstantiations.ts <tscPath> ...<tsconfigPaths>
// writes a JSON array of instantiation counts, one per tsconfig

const [tscPath, ...configPaths] = process.argv.slice(2)

const countInstantiations = (configPath: string) =>
	new Promise<number>((resolve, reject) =>
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
			// but option errors (TS5xxx) or errors without a location can skip checking
			(_, stdout, stderr) => {
				const count = /Instantiations:\s+(\d+)/.exec(stdout)?.[1]
				if (count === undefined || /^error TS|error TS5\d{3}:/m.test(stdout)) {
					reject(
						new Error(
							`Unable to read instantiations for ${configPath}:\n${stdout}${stderr}`
						)
					)
				} else resolve(Number(count))
			}
		)
	)

const counts: number[] = Array.from({ length: configPaths.length })
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
