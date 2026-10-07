import { isTs7 } from "../utils.ts"

export const baseDiagnosticTscCmd: string =
	"npm exec -- tsc --noEmit --extendedDiagnostics --incremental false --tsBuildInfoFile null" +
	// parallel checkers each instantiate their own copies of types
	(isTs7 ? " --singleThreaded" : "")
