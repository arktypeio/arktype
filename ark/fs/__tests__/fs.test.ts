import { attest, contextualize } from "@ark/attest"
import {
	ensureDir,
	findPackageAncestors,
	findPackageRoot,
	getSourceFilePaths,
	rmRf,
	writeFile,
	writeJson
} from "@ark/fs"
import { mkdtempSync, realpathSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"

contextualize(() => {
	it("findPackageRoot and findPackageAncestors resolve relative paths and terminate outside packages", () => {
		const tmpRoot = realpathSync(mkdtempSync(join(tmpdir(), "ark-fs-root-")))
		const prevCwd = process.cwd()
		try {
			const expectedOutside = findPackageRoot(tmpRoot)
			let fromDotOutside: string | null = null
			try {
				process.chdir(tmpRoot)
				fromDotOutside = findPackageRoot(".")
			} finally {
				process.chdir(prevCwd)
			}
			attest(fromDotOutside).equals(expectedOutside)

			const pkgDir = ensureDir(join(tmpRoot, "pkg"))
			const subDir = ensureDir(join(pkgDir, "src", "nested"))
			writeJson(join(pkgDir, "package.json"), { name: "fixture-pkg" })
			// stub without "name" should be skipped
			writeJson(join(pkgDir, "src", "package.json"), { type: "module" })

			let fromDotInside: string | null = null
			let ancestorsFromDot: string[] = []
			try {
				process.chdir(subDir)
				fromDotInside = findPackageRoot(".")
				ancestorsFromDot = findPackageAncestors(".")
			} finally {
				process.chdir(prevCwd)
			}
			attest(fromDotInside).equals(pkgDir)
			attest(ancestorsFromDot[0]).equals(pkgDir)
		} finally {
			rmRf(tmpRoot)
		}
	})

	it("getSourceFilePaths anchors ignored directory names to path segments", () => {
		const tmpRoot = realpathSync(mkdtempSync(join(tmpdir(), "ark-fs-walk-")))
		const checkoutDir = ensureDir(join(tmpRoot, "checkout-fixture"))
		const prevCwd = process.cwd()
		try {
			for (const rel of [
				"src/index.ts",
				"src/router/page.ts",
				"src/distribute/helper.ts",
				"out/built.ts",
				"dist/bundle.ts",
				"node_modules/pkg/index.ts",
				"docgen/out.ts"
			]) {
				ensureDir(join(checkoutDir, rel, ".."))
				writeFile(join(checkoutDir, rel), "export {}\n")
			}

			const foundAbs = getSourceFilePaths(checkoutDir)
				.map(p => relative(checkoutDir, p).replace(/\\/g, "/"))
				.sort()
			attest(foundAbs).equals([
				"src/distribute/helper.ts",
				"src/index.ts",
				"src/router/page.ts"
			])

			let foundRel: string[] = []
			try {
				process.chdir(checkoutDir)
				foundRel = getSourceFilePaths(".")
					.map(p => p.replace(/\\/g, "/"))
					.sort()
			} finally {
				process.chdir(prevCwd)
			}
			attest(foundRel).equals([
				"src/distribute/helper.ts",
				"src/index.ts",
				"src/router/page.ts"
			])

			const outAncestorProj = ensureDir(join(tmpRoot, "out", "proj"))
			for (const rel of [
				"src/a.ts",
				"b.ts",
				"out/ignored.ts",
				"src/out/nestedIgnored.ts"
			]) {
				ensureDir(join(outAncestorProj, rel, ".."))
				writeFile(join(outAncestorProj, rel), "export {}\n")
			}

			const foundUnderOutAbs = getSourceFilePaths(outAncestorProj)
				.map(p => relative(outAncestorProj, p).replace(/\\/g, "/"))
				.sort()
			attest(foundUnderOutAbs).equals(["b.ts", "src/a.ts"])

			let foundUnderOutRel: string[] = []
			try {
				process.chdir(tmpRoot)
				foundUnderOutRel = getSourceFilePaths(join("out", "proj"))
					.map(p => p.replace(/\\/g, "/"))
					.sort()
			} finally {
				process.chdir(prevCwd)
			}
			attest(foundUnderOutRel).equals(["out/proj/b.ts", "out/proj/src/a.ts"])
		} finally {
			rmRf(tmpRoot)
		}
	})
})
