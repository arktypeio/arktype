import type { AttestConfig } from "@arktype/attest"
import { shell } from "@arktype/fs"

process.env.ATTEST_CONFIG = JSON.stringify({
	tsVersions: "*"
} satisfies AttestConfig)
shell("pnpm test")
