import { attest, contextualize } from "@ark/attest"
import { getDiagnosticTscOutput } from "@ark/attest/internal/cli/shared.ts"
import { narrowToNamedTestFiles } from "@ark/attest/internal/utils.ts"
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
	}).timeout(60000)

	it("narrows analysis to the test files named", () => {
		const { argv } = process
		const { ATTEST_CONFIG } = process.env
		const named = fromHere("cli.test.ts").replace(/\\/g, "/")
		const other = fromHere("snap.test.ts").replace(/\\/g, "/")
		try {
			// setup() passes the flag on through ATTEST_CONFIG
			delete process.env.ATTEST_CONFIG
			process.argv = [argv[0], argv[1], named]
			// files named without the flag are added to mocha's spec, so all run
			attest(narrowToNamedTestFiles([named, other])).equals([named, other])
			process.argv.push("--onlyNamedTestFiles")
			attest(narrowToNamedTestFiles([named, other])).equals([named])
			// a named file outside the project can't narrow it to nothing
			attest(narrowToNamedTestFiles([other])).equals([other])
		} finally {
			process.argv = argv
			if (ATTEST_CONFIG) process.env.ATTEST_CONFIG = ATTEST_CONFIG
		}
	})
})
