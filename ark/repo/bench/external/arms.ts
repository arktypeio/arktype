// writes out/arms.json: every measured process, as count.ts and wall.ts run it.
// `count` lists the instruction counts (C1), `wall` the arms of the paired
// wall-clock run (H1-H4), both fixed before any data
// MOLTAR=<moltar clone> NODE24=<node 24 binary> node arms.ts
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const here = import.meta.dirname
const moltar = process.env.MOLTAR ?? "../typescript-runtime-type-benchmarks"
const node = process.env.NODE24 ?? "node"

export type Arm = { cwd: string; node: string; args: string[] }

const moltarArm = (caseFile: string, module: string, benchmark: string) => ({
	cwd: moltar,
	node,
	args: [
		"--no-experimental-strip-types",
		"-r",
		"ts-node/register/transpile-only",
		join(here, "moltar/cjs/child.ts"),
		moltar,
		caseFile,
		module,
		benchmark
	]
})

const ours = join(here, "moltar/cjs/cases.ts")

// moltar's published top libraries per case, by their case file
const rivals: Record<string, string> = {
	"@ts-runtypes": "ts-runtypes",
	typia: "typia",
	"@sx3/gate": "sx3-gate",
	"rescript-schema": "rescript-schema",
	"ata-(ahead-of-time)": "ata-aot",
	ata: "ata",
	"zod (compiled)": "zod",
	"paseri-(ahead-of-time)": "paseri-aot",
	sury: "sury",
	spectypes: "spectypes",
	"pure-parse (JIT compiled)": "pure-parse",
	"ts-runtime-checks": "ts-runtime-checks",
	"@sinclair/typebox-(just-in-time)": "sinclair-typebox-just-in-time",
	"@sinclair/typebox-(ahead-of-time)": "sinclair-typebox-ahead-of-time",
	"type-predicate-generator": "type-predicate-generator",
	"stnl (just-in-time)": "stnl",
	"ts-auto-guard": "ts-auto-guard",
	"@sinclair/typemap/valibot": "sinclair-typemap-valibot",
	ajv: "ajv"
}

const shared = Object.keys(rivals).slice(0, 10)
const rivalsByCase: Record<string, string[]> = {
	parseSafe: [...shared, "pure-parse (JIT compiled)"],
	assertLoose: Object.keys(rivals),
	assertStrict: [
		...shared,
		"ts-runtime-checks",
		"@sinclair/typebox-(just-in-time)",
		"@sinclair/typebox-(ahead-of-time)",
		"@sinclair/typemap/valibot",
		"ajv"
	],
	parseStrict: [
		...shared,
		"pure-parse (JIT compiled)",
		"ts-runtime-checks",
		"@sinclair/typebox-(just-in-time)"
	]
}

const sbArm = (bundle: string) => ({
	cwd: join(here, "sb"),
	node,
	args: [
		join(here, "sb/child.ts"),
		join(here, "sb/out", `${bundle}.mjs`),
		"valid"
	]
})

const count: Record<string, Arm> = {}
for (const [benchmark, names] of Object.entries(rivalsByCase)) {
	for (const build of ["b1", "b2", "dynamic"]) {
		count[`${benchmark} arktype-${build}`] = moltarArm(
			ours,
			`arktype-${build}`,
			benchmark
		)
	}
	for (const name of names)
		count[`${benchmark} ${name}`] = moltarArm(rivals[name], name, benchmark)
}
for (const benchmark of ["assertStrict", "parseStrict"]) {
	count[`${benchmark} arktype-2.2.9`] = moltarArm(
		ours,
		"arktype-2.2.9",
		benchmark
	)
}
count["sb valid b1"] = sbArm("b1")
count["sb valid dynamic"] = sbArm("dynamic")

// every rival within 25% of b1's instruction count, as the plan names them
const wallRivals = {
	parseSafe: [
		"@ts-runtypes",
		"typia",
		"ata-(ahead-of-time)",
		"ata",
		"rescript-schema",
		"@sx3/gate"
	],
	assertLoose: [
		"ts-runtime-checks",
		"ts-auto-guard",
		"type-predicate-generator",
		"@sinclair/typebox-(ahead-of-time)",
		"typia",
		"@ts-runtypes"
	]
}
const wall: Record<string, Arm> = {}
for (const [benchmark, names] of Object.entries(wallRivals)) {
	for (const name of ["arktype-b1", ...names])
		wall[`${benchmark} ${name}`] = count[`${benchmark} ${name}`]
}
wall["sb valid b1"] = count["sb valid b1"]
wall["sb valid dynamic"] = count["sb valid dynamic"]
wall["assertStrict arktype-dynamic"] = count["assertStrict arktype-dynamic"]
wall["assertStrict arktype-2.2.9"] = count["assertStrict arktype-2.2.9"]

mkdirSync(join(here, "out"), { recursive: true })
writeFileSync(
	join(here, "out/arms.json"),
	JSON.stringify({ count, wall }, null, 1)
)
console.log(
	`${Object.keys(count).length} count arms, ${Object.keys(wall).length} wall arms`
)
