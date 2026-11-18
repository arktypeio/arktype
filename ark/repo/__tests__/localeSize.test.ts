import { attest, contextualize } from "@ark/attest"
import { buildSync } from "esbuild"
import { readFileSync } from "node:fs"
import { gzipSync } from "node:zlib"

const budget = 3.75 * 1024

const { exports } = JSON.parse(
	readFileSync(new URL("../../type/package.json", import.meta.url), "utf8")
)

// en is arktype's own text, so it ships with arktype whether or not it's imported
const tags = Object.keys(exports)
	.filter(subpath => subpath.startsWith("./locales/"))
	.map(subpath => subpath.slice("./locales/".length))
	.filter(tag => tag !== "en")

// minified and gzipped beside the @ark/util and @ark/schema/i18n it imports
const gzippedSizeOf = (tag: string) => {
	const { outputFiles } = buildSync({
		stdin: {
			contents: `export * from "arktype/locales/${tag}"`,
			resolveDir: import.meta.dirname
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		conditions: ["ark-ts"],
		external: ["@ark/util", "@ark/schema/i18n"],
		write: false,
		logLevel: "warning"
	})
	return gzipSync(outputFiles[0].contents).length
}

contextualize(() => {
	it("finds the locales", () => {
		attest(tags).equals(["de"])
	})

	it("keeps each locale within its budget", () => {
		for (const tag of tags) {
			const size = gzippedSizeOf(tag)
			if (size > budget) {
				throw new Error(
					`arktype/locales/${tag} is ${size} bytes gzipped, over ${budget}`
				)
			}
		}
	})
})
