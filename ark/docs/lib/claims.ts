/**
 * Every benchmark number or superlative the site states outside the
 * homepage's own benchmark (lib/bench), in one place so each can be checked
 * against the benchmark that backs it.
 *
 * A `pending` value is draft copy that isn't backed yet. It renders marked as
 * pending, so nothing unverified reads as a claim.
 */

export type Pending<t> = { pending: t }

export type Claim<t> = t | Pending<t>

export const isPending = <t>(claim: Claim<t>): claim is Pending<t> =>
	typeof claim === "object" && claim !== null && "pending" in claim

export const draftOf = <t>(claim: Claim<t>): t =>
	isPending(claim) ? claim.pending : claim

export type BarKind = "precompiled" | "dynamic" | "other"

export interface BenchmarkBar {
	name: string
	kind: BarKind
	/** null until the benchmark backing it is verified */
	value: number | null
}

export interface BenchmarkChart {
	title: string
	/** the benchmark, its options and its environment */
	detail: Claim<string>
	unit: string
	source: {
		label: string
		href: string
	}
	/** where the axis ends, if a bar runs past it */
	axisMax?: number
	bars: BenchmarkBar[]
}

/**
 * Shaped by the claims lane's claims.md (precompile 61c3fe807, Node 24.14.1),
 * whose harnesses and raw results are in that thread's lane-claims directory.
 * Each claim is scoped as claims.md scopes it: precompiled or dynamic, valid
 * or invalid data, with or without errors. Every number stays null and every
 * sentence pending until a re-measure at the release commit backs it. The
 * comments give 61c3fe807's numbers.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape. They rank libraries as moltar's published node-24 wall
// clock does, but a 10% lead projects to 3-5% in wall: say "fastest", never
// "x times faster". Precompiled leads parseSafe and assertLoose; it's #5 on
// the strict cases, and dynamic is #8-#10 everywhere.
// 61c3fe807: 189, 209, 213, 220, 262.
export const speedChart: BenchmarkChart = {
	title: "Runtime",
	detail: {
		pending:
			"moltar's parseSafe benchmark (validate, removing undeclared keys), Node 24"
	},
	unit: "instructions per call",
	source: {
		label: "moltar/typescript-runtime-type-benchmarks",
		href: "https://moltar.github.io/typescript-runtime-type-benchmarks/"
	},
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: null },
		{ name: "@ts-runtypes", kind: "other", value: null },
		{ name: "Typia", kind: "other", value: null },
		{ name: "ata-validator (AOT)", kind: "other", value: null },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: null }
	]
}

// bundlejs-style esbuild of valibot.dev's login form, every entry reporting
// every error with its message. Precompiled beats Valibot only with its
// validator's members and methods off ("default+lean"); with every member
// kept it's larger. 61c3fe807: 1341, 1475, 5127, 25058, 74726.
export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail: {
		pending:
			"valibot.dev's login form, each reporting every error with a message; precompiled with its validator's methods and members off"
	},
	unit: "B gzipped",
	source: {
		label: "valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	axisMax: 26_000,
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: null },
		{ name: "Valibot", kind: "other", value: null },
		{ name: "Zod Mini", kind: "other", value: null },
		{ name: "Zod", kind: "other", value: null },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: null }
	]
}

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// David's draft; claims.md: true only with qualifiers at 61c3fe807
	headline: { pending: "The smallest, fastest validation" },
	// the sentence under the docs' charts
	chartsSummary: {
		pending:
			"Precompiled ArkType is the fastest on moltar's parseSafe and assertLoose benchmarks, and on Valibot's own login form it reports every error, with its message, in a smaller bundle than Valibot."
	},
	// claims.md §3: valid data, validation, parsing and Standard Schema, both
	// modes. 61c3fe807: 5-9% fewer instructions than ata-validator, 0.75-0.82x
	// its time in paired wall runs, faster in 47 of 60.
	validData: {
		pending:
			"On schemabenchmarks.dev, precompiled and dynamic ArkType both validate valid data faster than ata-validator, its current #1."
	},
	// claims.md §3 MAKE: the product schema, valid data, both modes run the
	// same checks. 61c3fe807: 5989 vs 5982 instructions, wall
	// precompiled/dynamic 0.98x (p 0.39, a tie).
	dynamicSpeed: {
		pending:
			"On schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType."
	},
	// claims.md §1: precompiled, -11% instructions, faster than every rival in
	// 9-11 of 12 paired wall runs.
	assertLoose: {
		pending:
			"Precompiled ArkType is the fastest on moltar's assertLoose benchmark."
	},
	// claims.md §2a. 61c3fe807: 1.34 vs 1.48 kB gz, members and methods off.
	loginSize: {
		pending:
			"On Valibot's own login form, precompiled ArkType reports every error, with its message, in a smaller bundle than Valibot: N kB gzipped against N kB."
	},
	// claims.md §1: moltar strict, dynamic. 61c3fe807: 4067 -> 355 instructions.
	strictSpeedup: {
		pending:
			"Dynamic ArkType validates moltar's strict cases about N times faster than 2.2."
	},
	// claims.md §3 MAKE: 26 instructions, the harness floor; typia createIs 224.
	// Honest only with "the Type is built at build time".
	noInit: {
		pending:
			"A precompiled Type costs nothing to create: it was built when you built."
	}
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims

export interface Stat {
	value: Claim<string>
	label: Claim<string>
}

// drafted from claims.md's MAKE claims; N marks a number its refresh fills
export const heroStats: Stat[] = [
	{
		value: { pending: "Fastest" },
		label: {
			pending:
				"on moltar's parseSafe and assertLoose benchmarks, precompiled: N% fewer instructions per call than the next library"
		}
	},
	{
		value: { pending: "N% less time" },
		label: {
			pending:
				"validating valid data than ata-validator, schemabenchmarks.dev's current #1, precompiled or not"
		}
	},
	{
		value: { pending: "N kB" },
		label: {
			pending:
				"for Valibot's own login form with every error message, precompiled: smaller than Valibot's N kB gzipped"
		}
	}
]
