import { getShellOutput, rmRf } from "@ark/fs"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { isTs7 } from "../utils.ts"

const baseDiagnosticTscCmd =
	"npm exec -- tsc --noEmit --extendedDiagnostics --incremental" +
	// parallel checkers each instantiate their own copies of types
	(isTs7 ? " --singleThreaded" : "")

export const getDiagnosticTscOutput = (cwd: string, args = ""): string => {
	// composite projects can't disable incremental, so a fresh build info file
	// keeps stale state from skipping the check
	const buildInfoDir = mkdtempSync(join(tmpdir(), "attest-"))
	try {
		return getShellOutput(
			`${baseDiagnosticTscCmd} --tsBuildInfoFile "${join(buildInfoDir, "tsconfig.tsbuildinfo")}" ${args}`,
			{ cwd }
		)
	} finally {
		rmRf(buildInfoDir)
	}
}
