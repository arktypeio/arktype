import { ensureDir, readFile, walkPaths, writeFile } from "@ark/fs"
import { join } from "node:path"
import { repoDirs } from "../../repo/shared.ts"

const contentDir = join(repoDirs.docs, "content", "docs")
const publicDir = join(repoDirs.docs, "public")

/** each docs section and the public path its llms.txt is served from */
const sections = {
	"(arktype)": "",
	attest: join("docs", "attest")
}

export const writeLlmsTxt = () => {
	for (const [section, outDir] of Object.entries(sections)) {
		const paths = walkPaths(join(contentDir, section), {
			excludeDirs: true,
			include: path => path.endsWith(".mdx")
		})

		const contents = paths.map(readFile).join("\n\n")

		writeFile(join(ensureDir(join(publicDir, outDir)), "llms.txt"), contents)
	}
}
