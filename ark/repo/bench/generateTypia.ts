import { spawnSync } from "node:child_process"
import { rmSync } from "node:fs"
import { join } from "node:path"

const env = { ...process.env }
// ttsc builds typia's Go plugin with its bundled Go, which a GOROOT would override
delete env.GOROOT

rmSync(join(import.meta.dirname, "out", "typia"), {
	recursive: true,
	force: true
})

const result = spawnSync(
	join(import.meta.dirname, "..", "node_modules", ".bin", "ttsc"),
	["--project", join(import.meta.dirname, "tsconfig.typia.json")],
	{ env, stdio: "inherit" }
)
if (result.status !== 0) process.exit(result.status ?? 1)
