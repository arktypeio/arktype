import { readFile, walkPaths, writeFile } from "@ark/fs"
import { join } from "node:path"
import { repoDirs } from "../../repo/shared.ts"

export const writeLlmsTxt = () => {
	const contentDir = join(repoDirs.docs, "content", "docs")
	const paths = walkPaths(contentDir, {
		excludeDirs: true,
		include: path => path.endsWith(".mdx")
	})

	const contents = paths.map(readFile).join("\n\n")

	writeFile(join(repoDirs.docs, "public", "llms.txt"), contents)
}
