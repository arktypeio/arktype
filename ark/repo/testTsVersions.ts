import { forEachTypeScriptVersion } from "@arktype/attest"
import { shell } from "@arktype/fs"

forEachTypeScriptVersion(() => {
	shell("pnpm test")
})
