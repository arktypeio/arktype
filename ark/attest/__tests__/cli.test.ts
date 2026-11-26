import { attest, contextualize } from "@ark/attest"
import { getDiagnosticTscOutput } from "@ark/attest/internal/cli/shared.ts"
import {
	parseCallSite,
	resolveTraceTsconfig
} from "@ark/attest/internal/cli/trace.ts"
import {
	getSuiteName,
	narrowToNamedTestFiles
} from "@ark/attest/internal/utils.ts"
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

	it("parses callSites including Windows drive letters", () => {
		attest(parseCallSite("C:\\path\\to\\file.ts:10-20")).equals({
			path: "C:\\path\\to\\file.ts",
			pos: 10,
			end: 20
		})
		attest(parseCallSite("C:/path/to/file.ts:0-5")).equals({
			path: "C:/path/to/file.ts",
			pos: 0,
			end: 5
		})
		attest(parseCallSite("/home/user/file.ts:100-250")).equals({
			path: "/home/user/file.ts",
			pos: 100,
			end: 250
		})
		attest(() => parseCallSite("no-colon")).throws(
			"Invalid callSite format: no-colon"
		)
		attest(() => parseCallSite("C:\\path\\file.ts:bad-range")).throws(
			"Invalid position in callSite: C:\\path\\file.ts:bad-range"
		)
	})

	it("resolves trace tsconfig relative to packageDir", () => {
		const rootDir = fromHere(".attest-trace-tsconfig")
		const pkgDir = join(rootDir, "pkg")
		const emptyDir = join(rootDir, "empty")
		try {
			ensureDir(pkgDir)
			ensureDir(emptyDir)
			const rootTsconfig = join(rootDir, "tsconfig.json")
			const pkgTsconfig = join(pkgDir, "tsconfig.json")
			const customTsconfig = join(pkgDir, "tsconfig.custom.json")
			writeJson(rootTsconfig, {})
			writeJson(pkgTsconfig, {})
			writeJson(customTsconfig, {})

			// defaults to packageDir/tsconfig.json even when cwd has its own tsconfig
			attest(resolveTraceTsconfig(pkgDir, rootTsconfig, rootDir)).equals(
				pkgTsconfig
			)
			// finds packageDir/tsconfig.json even when cwd has none
			attest(resolveTraceTsconfig(pkgDir, undefined, emptyDir)).equals(
				pkgTsconfig
			)
			// returns undefined when packageDir has no tsconfig
			attest(resolveTraceTsconfig(emptyDir, rootTsconfig, rootDir)).equals(
				undefined
			)
			// resolves explicit custom tsconfig relative to packageDir
			attest(
				resolveTraceTsconfig(pkgDir, "tsconfig.custom.json", rootDir)
			).equals(customTsconfig)
		} finally {
			rmRf(rootDir)
		}
	})

	it("strips the matched test suffix when computing suite names", () => {
		attest(getSuiteName("/repo/pkg/__tests__/foo.test.ts")).equals("foo")
		attest(getSuiteName("/repo/pkg/__tests__/foo.test.tsx")).equals("foo")
		attest(getSuiteName("/repo/pkg/__tests__/foo.test.mts")).equals("foo")
		attest(getSuiteName("/repo/pkg/__tests__/foo.test.js")).equals("foo")
		attest(getSuiteName("/repo/pkg/__tests__/nested/bar.spec.cts")).equals(
			"nested/bar"
		)
		attest(getSuiteName("/repo/pkg/__tests__/perf.bench.ts")).equals("perf")
		attest(getSuiteName("/repo/pkg/__tests__/helper.ts")).equals("helper")
		attest(getSuiteName("/repo/pkg/standalone.test.mjs")).equals("standalone")
	})
})
