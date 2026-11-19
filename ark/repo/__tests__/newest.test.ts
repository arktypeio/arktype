import { attest, contextualize } from "@ark/attest"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	carriedWith,
	highestOf,
	holdsFor,
	specsFor
} from "../bench/external/newest.ts"

const sb = [
	"ata-validator@1.60.0",
	"typia@15.2.1",
	"ttsc@0.34.1",
	"@ttsc/unplugin@0.34.1"
]

const tools = { ttsc: "0.37.2", "@ttsc/unplugin": "0.37.2" }

contextualize(() => {
	it("moves a rival's toolchain with it, at the versions resolved for it", () => {
		attest(specsFor({ releases: sb, tools, held: {}, last: {} })).snap([
			"ata-validator@latest",
			"typia@latest",
			"ttsc@0.37.2",
			"@ttsc/unplugin@0.37.2"
		])
	})

	it("a held rival takes the toolchain that last built it, and others still move", () => {
		attest(
			specsFor({
				releases: ["zod", "typia", "ttsc"],
				tools,
				held: { typia: { newest: "15.4.1", kept: "15.2.2" } },
				last: { zod: "4.6.7", typia: "15.2.2", ttsc: "0.36.2" }
			})
		).snap(["zod@latest", "typia@15.2.2", "ttsc@0.36.2"])
	})

	it("a held rival's toolchain the last run didn't record stays at the suite's pin", () => {
		attest(
			specsFor({
				releases: sb,
				tools,
				held: { typia: { newest: "15.4.1", kept: "15.2.2" } },
				last: { "ata-validator": "1.63.1", typia: "15.2.2" }
			})
		).snap(["ata-validator@latest", "typia@15.2.2"])
	})

	it("a package is a toolchain only beside the rival that builds on it", () => {
		attest(
			specsFor({
				releases: ["zod@4.6.7", "ttsc@0.34.1"],
				tools,
				held: {},
				last: {}
			})
		).snap(["zod@latest", "ttsc@latest"])
	})

	it("holds a rival with a build step at the last release the suite built", () => {
		attest(
			holdsFor({
				releases: sb,
				last: { "ata-validator": "1.63.1", typia: "15.2.2" },
				latest: { typia: "15.4.1" }
			})
		).snap({ typia: { newest: "15.4.1", kept: "15.2.2" } })
	})

	it("holds at the suite's pin where it has no run yet", () => {
		attest(
			holdsFor({ releases: sb, last: {}, latest: { typia: "15.4.1" } })
		).snap({ typia: { newest: "15.4.1", kept: "15.2.1" } })
	})

	it("holds nothing where the rival is already at its newest, or has no earlier release to keep", () => {
		attest(
			holdsFor({
				releases: sb,
				last: { typia: "15.4.1" },
				latest: { typia: "15.4.1" }
			})
		).equals({})
		attest(
			holdsFor({
				releases: ["typia", "ttsc"],
				last: {},
				latest: { typia: "15.4.1" }
			})
		).equals({})
		attest(
			holdsFor({
				releases: ["zod@4.6.7"],
				last: {},
				latest: { typia: "15.4.1" }
			})
		).equals({})
	})

	it("takes ArkType's sizes from a fresh file and keeps every rival's, by label at any depth", () => {
		attest(
			carriedWith(
				{
					esbuild: "0.28.1",
					production: {
						"ArkType schema": { gzip: 908 },
						"ArkType (dynamic) all": { gzip: 95000 },
						"Zod schema": { gzip: 13000 }
					}
				},
				{
					esbuild: "0.29.0",
					production: {
						"ArkType schema": { gzip: 900 },
						"ArkType (dynamic) all": { gzip: 95100 },
						"Zod schema": { gzip: 12000 },
						"Valibot schema": { gzip: 1500 }
					}
				}
			)
		).snap({
			esbuild: "0.28.1",
			production: {
				"ArkType schema": { gzip: 900 },
				"ArkType (dynamic) all": { gzip: 95100 },
				"Zod schema": { gzip: 13000 }
			}
		})
	})

	it("takes ArkType's elements of a list by the library and note each names", () => {
		attest(
			carriedWith(
				{
					minified: [
						{ libraryName: "arktype/precompiled", gzipBytes: 1547 },
						{ libraryName: "zod", note: "mini", gzipBytes: 2000 },
						{ libraryName: "arktype", gzipBytes: 95309 }
					]
				},
				{
					minified: [
						{ libraryName: "zod", note: "mini", gzipBytes: 1 },
						{ libraryName: "arktype", gzipBytes: 95390 },
						{ libraryName: "arktype/precompiled", gzipBytes: 1540 }
					]
				}
			)
		).snap({
			minified: [
				{ libraryName: "arktype/precompiled", gzipBytes: 1540 },
				{ libraryName: "zod", note: "mini", gzipBytes: 2000 },
				{ libraryName: "arktype", gzipBytes: 95390 }
			]
		})
	})

	it("keeps an entry of ArkType's the fresh file lacks", () => {
		attest(
			carriedWith(
				{
					"ArkType (dynamic)": { gzip: 97987 },
					list: [{ libraryName: "arktype" }]
				},
				{ list: [] }
			)
		).snap({
			"ArkType (dynamic)": { gzip: 97987 },
			list: [{ libraryName: "arktype" }]
		})
	})

	it("picks the highest release by number, not by text or position", () => {
		attest(highestOf(["0.37.9", "0.37.10", "0.38.0-rc.1", "0.37.2"])).snap(
			"0.37.10"
		)
		attest(highestOf("0.34.1")).snap("0.34.1")
		attest(() => highestOf(["1.0.0-beta.1"])).throws(
			"No release among 1.0.0-beta.1"
		)
	})
})
