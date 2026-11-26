import { attest, contextualize } from "@ark/attest"
import { getDiagnosticTscOutput } from "@ark/attest/internal/cli/shared.ts"
import {
	parseCallSite,
	ProgressDisplay,
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

	it("handles non-TTY stdout without clearLine or cursorTo in trace ProgressDisplay", () => {
		const stdout = process.stdout as typeof process.stdout & {
			clearLine?: typeof process.stdout.clearLine
			cursorTo?: typeof process.stdout.cursorTo
		}
		const prevIsTTY = Object.getOwnPropertyDescriptor(stdout, "isTTY")
		const prevClearLine = Object.getOwnPropertyDescriptor(stdout, "clearLine")
		const prevCursorTo = Object.getOwnPropertyDescriptor(stdout, "cursorTo")
		const prevWrite = stdout.write
		const written: string[] = []
		try {
			Object.defineProperty(stdout, "isTTY", {
				value: false,
				configurable: true
			})
			Object.defineProperty(stdout, "clearLine", {
				value: undefined,
				configurable: true
			})
			Object.defineProperty(stdout, "cursorTo", {
				value: undefined,
				configurable: true
			})
			stdout.write = ((chunk: string | Uint8Array) => {
				written.push(String(chunk))
				return true
			}) as typeof stdout.write

			const progress = new ProgressDisplay(2)
			progress.start()
			progress.update(1)
			progress.update(2)
			progress.stop()

			attest(written.length).equals(1)
			attest(
				/^Processing: \[={30}] 2\/2 entries \(100%\) \| .* \(Done\)\n$/.test(
					written[0]
				)
			).equals(true)
		} finally {
			stdout.write = prevWrite
			if (prevIsTTY) Object.defineProperty(stdout, "isTTY", prevIsTTY)
			else delete (stdout as { isTTY?: boolean }).isTTY
			if (prevClearLine)
				Object.defineProperty(stdout, "clearLine", prevClearLine)
			else delete (stdout as { clearLine?: unknown }).clearLine
			if (prevCursorTo) Object.defineProperty(stdout, "cursorTo", prevCursorTo)
			else delete (stdout as { cursorTo?: unknown }).cursorTo
		}
	})
})
