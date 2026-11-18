// each library on ark/docs/lib/bench/leaderboard.json's rows with its npm
// package's downloads over the last week, from npm's public downloads API, so
// the site names only libraries most readers know (wellKnownDownloads in
// ark/docs/lib/bench/leaderboard.ts). Writes results/downloads-<date>.json
// node downloads.ts
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { format, resolveConfig } from "prettier"

const here = import.meta.dirname

// each library as leaderboard.ts names it, and the package it's installed
// from: Zod's variants are all zod, TypeBox counts its two packages, and
// paseri, published only to JSR, has none
const packages: Record<string, string[]> = {
	ArkType: ["arktype"],
	Zod: ["zod"],
	"Zod (compiled)": ["zod"],
	"Zod Mini": ["zod"],
	"Zod 3": ["zod"],
	Valibot: ["valibot"],
	Typia: ["typia"],
	TypeBox: ["@sinclair/typebox", "typebox"],
	ajv: ["ajv"],
	"Effect Schema": ["effect"],
	Superstruct: ["superstruct"],
	Yup: ["yup"],
	Joi: ["joi"],
	"io-ts": ["io-ts"],
	runtypes: ["runtypes"],
	sury: ["sury"],
	ata: ["ata-validator"],
	paseri: [],
	"zod-compiler": ["zod-compiler"],
	decoders: ["decoders"],
	"pure-parse": ["pure-parse"],
	"rescript-schema": ["rescript-schema"],
	spectypes: ["spectypes"],
	stnl: ["stnl"],
	"ts-auto-guard": ["ts-auto-guard"],
	"ts-runtime-checks": ["ts-runtime-checks"],
	"type-predicate-generator": ["type-predicate-generator"],
	"@ts-runtypes": ["@ts-runtypes/core"],
	"@sx3/gate": ["@sx3/gate"],
	"@cfworker/json-schema": ["@cfworker/json-schema"],
	"@exodus/schemasafe": ["@exodus/schemasafe"],
	"@railway-ts/pipelines": ["@railway-ts/pipelines"],
	"@remix-run/data-schema": ["@remix-run/data-schema"],
	"@sapphire/shapeshift": ["@sapphire/shapeshift"],
	"@sinclair/typemap/valibot": ["@sinclair/typemap"]
}

const leaderboard: {
	suites: { rows: { results: Record<string, number> }[] }[]
} = JSON.parse(
	readFileSync(join(here, "../../../docs/lib/bench/leaderboard.json"), "utf8")
)
const libraries = [
	...new Set(
		leaderboard.suites.flatMap(s => s.rows.flatMap(r => Object.keys(r.results)))
	)
]
const unmapped = libraries.filter(library => !(library in packages))
if (unmapped.length)
	throw new Error(`No npm package for ${unmapped.join(", ")}`)

type Point = { downloads: number; start: string; end: string }

// npm rate limits the API, so a 429 waits and retries
const pointOf = async (pkg: string, attempt = 0): Promise<Point> => {
	const response = await fetch(
		`https://api.npmjs.org/downloads/point/last-week/${pkg}`
	)
	if (response.status === 429 && attempt < 5) {
		await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt))
		return pointOf(pkg, attempt + 1)
	}
	if (!response.ok) throw new Error(`${pkg}: ${response.status}`)
	return (await response.json()) as Point
}

const points: Record<string, Point> = {}
for (const pkg of new Set(libraries.flatMap(library => packages[library])))
	points[pkg] = await pointOf(pkg)

const weeks = new Set(
	Object.values(points).map(({ start, end }) => `${start} to ${end}`)
)
if (weeks.size !== 1)
	throw new Error(`npm returned different weeks: ${[...weeks].join(", ")}`)

const byLibrary = Object.fromEntries(
	libraries
		.map(library => ({
			library,
			packages: packages[library],
			downloads: packages[library].reduce(
				(sum, pkg) => sum + points[pkg].downloads,
				0
			)
		}))
		.sort((l, r) => r.downloads - l.downloads)
		.map(({ library, ...rest }) => [library, rest])
)

const [week] = weeks
const out = join(
	here,
	"results",
	`downloads-${new Date().toISOString().slice(0, 10)}.json`
)
writeFileSync(
	out,
	await format(
		JSON.stringify({
			source: "https://api.npmjs.org/downloads/point/last-week/<package>",
			week,
			libraries: byLibrary
		}),
		{ ...(await resolveConfig(out)), filepath: out }
	)
)
console.log(out)
