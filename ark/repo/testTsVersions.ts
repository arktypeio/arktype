import type { AttestConfig } from "@ark/attest"
import { shell } from "@ark/fs"

process.env.ATTEST_CONFIG = JSON.stringify({
	tsVersions: "*"
} satisfies AttestConfig)
shell("pnpm testTyped")
