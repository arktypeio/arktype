import { attest, contextualize } from "@ark/attest"
import { dirName, fromHere } from "@ark/fs"
import { spawnSync } from "node:child_process"

const runTypeBenchWithErrorConfig = (benchErrorOnThresholdExceeded: string) =>
	spawnSync(
		"node",
		["--conditions=ark-ts", fromHere("benchThresholdTemplate.ts")],
		{
			cwd: dirName(),
			// before the ATTEST_CONFIG setup() exports, where Windows sorts it
			env: {
				ATTEST_benchErrorOnThresholdExceeded: JSON.stringify(
					benchErrorOnThresholdExceeded
				),
				...process.env
			}
		}
	).status

contextualize(() => {
	it("types fails a type bench", () => {
		attest(runTypeBenchWithErrorConfig("types")).equals(1)
	}).timeout(60000)

	it("runtime ignores a type bench", () => {
		attest(runTypeBenchWithErrorConfig("runtime")).equals(0)
	}).timeout(60000)
})
