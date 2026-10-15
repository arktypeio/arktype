import { attest, contextualize } from "@ark/attest"
import { getDiagnosticTscOutput } from "@ark/attest/internal/cli/shared.ts"
import { ensureDir, fromHere, rmRf, writeFile, writeJson } from "@ark/fs"
import { join } from "node:path"

contextualize(() => {
	// https://github.com/arktypeio/arktype/issues/1306
	it("checks a composite project", () => {
		const projectDir = fromHere(".attest")
		try {
			ensureDir(join(projectDir, "src"))
			writeJson(join(projectDir, "tsconfig.json"), {
				compilerOptions: {
					composite: true,
					declarationMap: true,
					rootDir: "src",
					outDir: "dist",
					types: []
				},
				include: ["src"]
			})
			writeFile(
				join(projectDir, "src", "index.ts"),
				"export const values: Array<number> = [5]"
			)
			attest(getDiagnosticTscOutput(projectDir)).satisfies(
				"/Instantiations: +[1-9]/"
			)
		} finally {
			rmRf(projectDir)
		}
	})
})
