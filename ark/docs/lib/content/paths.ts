import { existsSync } from "node:fs"
import { join } from "node:path"

// Next bundles server code, which moves import.meta.url, so paths are found
// from the working directory: ark/docs under Next, the repo root under mocha
export const docsDir: string =
	existsSync(join(process.cwd(), "content", "docs")) ?
		process.cwd()
	:	join(process.cwd(), "ark", "docs")

export const contentDir: string = join(docsDir, "content", "docs")

export const publicDir: string = join(docsDir, "public")

export const repoArkDir: string = join(docsDir, "..")

/** survives `next build` wiping .next and is ignored by git with node_modules */
export const cacheDir: string = join(
	docsDir,
	"node_modules",
	".cache",
	"ark-docs"
)
