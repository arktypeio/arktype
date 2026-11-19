import Link from "next/link"
import { benchFacts, type BenchFacts } from "../../lib/bench/bench.ts"
import { claims, medianOf, presetSizeRows } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import {
	categoryOf,
	kB,
	loginKb,
	methodHref,
	startupFacts,
	zodSizeRatio
} from "./boardFacts.ts"
import { BootLog } from "./BootLog.tsx"
import { ByteGrid } from "./ByteGrid.tsx"
import { Drill, Drills, Point } from "./Drill.tsx"
import { Guarantee } from "./Guarantee.tsx"
import { SpeedBars } from "./SpeedBars.tsx"
import { SpeedCount } from "./SpeedCount.tsx"

/** "2 of 13 valid-data scenarios", or "all 13 scenarios" while no library is faster on any */
const validShare = (facts: BenchFacts) =>
	facts.mostFaster ?
		`${facts.mostFaster} of ${facts.validCount} valid-data scenarios`
	:	`all ${facts.validCount} scenarios`

type FactsProps = {
	facts: BenchFacts
}

/** the two results ArkType doesn't sweep: the valid-data rows it lost, and ajv on the rows that report errors */
const Losses = ({ facts }: FactsProps) => {
	const ajvRows =
		facts.ajvFasterCount === facts.errorCount ?
			`all ${facts.errorCount}`
		:	`${facts.ajvFasterCount} of ${facts.errorCount}`
	return (
		<div className="figs">
			<div className="fig">
				<div className="n">
					{facts.mostFaster ?
						`${facts.mostFaster} of ${facts.validCount}`
					:	`${facts.validWins} of ${facts.validCount}`}
				</div>
			</div>
			{facts.mostFaster ?
				<p className="fig-p">
					valid-data scenarios is the most any one library beat precompiled
					ArkType on: {facts.mostFasterBy}.
					{facts.fasterOthers &&
						` Also faster: ${facts.fasterOthers}${facts.fasterOthersMostlyTied ? ", ties in most other runs that day" : ""}.`}
					{!facts.fasterOthersMostlyTied &&
						facts.unsteadyLosses &&
						` In most other runs that day, ${facts.unsteadyLosses} were ties.`}{" "}
					ArkType was fastest in {facts.validWins}
					{facts.ties && ` and tied ${facts.ties}`}.
				</p>
			:	<p className="fig-p">
					valid-data scenarios where precompiled ArkType was fastest.
					{facts.ties && ` Tied: ${facts.ties}.`}
				</p>
			}
			<div className="fig">
				<div className="n sm">ajv</div>
			</div>
			<p className="fig-p">
				was faster on {ajvRows} rows that report errors on invalid data, by{" "}
				{facts.ajvMin} to {facts.ajvMax}. If your hot path reports errors, ajv
				is the one to beat.
				{facts.rejection &&
					` Rejecting invalid input with a boolean check, ArkType was ${facts.rejection}.`}
			</p>
		</div>
	)
}

/** a section's one way out to how its numbers were measured */
const Measured = () => (
	<Link className="drill-link" href={methodHref}>
		how we measured →
	</Link>
)

/** 01: validation speed, as validations finished at each library's median */
export const Speed = () => {
	const facts = benchFacts()
	const [zod, zodCompiled] = categoryOf("speed").versus
	const swept = zod.versus.wins === zod.versus.count
	const sweptCompiled = zodCompiled.versus.wins === zodCompiled.versus.count
	return (
		<Point
			id="run"
			n="01"
			kicker="run"
			layout="split"
			stat={{
				value: medianOf(zod.versus),
				unit: "faster than Zod 4, at the median scenario"
			}}
			title={
				swept ?
					`${zod.versus.count} scenarios against Zod 4. ${zod.versus.wins} wins.`
				:	<>
						Precompiled, it was <ClaimText claim={claims.zodSpec} />.
					</>
			}
			deck={
				sweptCompiled ?
					<>
						{medianOf(zodCompiled.versus)} faster than Zod's own{" "}
						<code>z.compile</code> at the median, too.
					</>
				:	<>
						And faster than Zod 4's <code>z.compile</code> in{" "}
						{zodCompiled.versus.wins} of {zodCompiled.versus.count}, by a median
						of {medianOf(zodCompiled.versus)}.
					</>
			}
			figure={<SpeedCount />}
			caveat={
				<p className="loses" id="loses">
					<b>Where it loses.</b> <ClaimText claim={claims.speedScope} />
				</p>
			}
		>
			<Drills name="run" links={<Measured />}>
				<Drill
					chip={`all ${zod.versus.count} scenarios`}
					verdict="A bar is a library's median scenario. Under it: its closest scenario, its farthest, and how many it was slower on."
				>
					<SpeedBars />
				</Drill>
				<Drill
					chip="where we lose"
					verdict={
						<>
							ajv is faster where the hot path reports errors: on{" "}
							{facts.ajvFasterCount} of {facts.errorCount} such rows.
						</>
					}
				>
					<p className="drill-p">
						We raced it against the ahead-of-time compilers (typia, TypeBox,
						ajv) and the libraries you'd otherwise write schemas with (Zod 4,
						compiled or not, and Valibot), on the same inputs.{" "}
						{facts.mostFaster ?
							"On valid data, no other library was faster in more than "
						:	"On valid data, it was fastest or tied in "}
						{validShare(facts)}.
					</p>
					<Losses facts={facts} />
					<p className="note">
						{
							"// prefer no build step? dynamic ArkType runs the same definitions, "
						}
						<ClaimText claim={claims.dynamicSpec} />
					</p>
				</Drill>
			</Drills>
		</Point>
	)
}

/** the "smallest" preset's table, its apps named so none reads as Valibot's login form */
const presetAppNames: Record<string, string> = {
	"a login form": "our startup benchmark's login app",
	"a shop": "its shop app"
}

const PresetRows = () => (
	<div className="scale-rows">
		<table className="scale-table is-preset">
			<thead>
				<tr>
					<th scope="col">gzipped production bundle</th>
					<th scope="col">default</th>
					<th scope="col">"smallest"</th>
					<th scope="col">Valibot</th>
				</tr>
			</thead>
			<tbody>
				{presetSizeRows.map(row => {
					const [app, types] = row.label.split(", ")
					return (
						<tr key={row.label}>
							<th scope="row">
								{types ? `${presetAppNames[app] ?? app}, ${types}` : row.label}
							</th>
							{[row.default, row.smallest, row.valibot].map((size, i) => (
								<td key={i}>{kB(size)}</td>
							))}
						</tr>
					)
				})}
			</tbody>
		</table>
	</div>
)

/** 02: bundle size, as the blocks a precompiled build leaves behind */
export const Size = () => (
	<Point
		id="size"
		n="02"
		kicker="ship"
		layout="flip"
		stat={{
			value: zodSizeRatio(),
			unit: "smaller than Zod 4, on Valibot's own login form"
		}}
		title="Ship the checks, not the parser."
		deck={`Valibot's own login form, messages included: ${loginKb("ArkType (precompiled)")} kB gzipped. Valibot ships ${loginKb("Valibot")}. Zod ships ${loginKb("Zod")}.`}
		figure={<ByteGrid />}
	>
		<Drills
			name="size"
			links={
				<>
					<Link className="drill-link" href="/docs/precompile/size-at-scale">
						as your app grows →
					</Link>
					<Measured />
				</>
			}
		>
			<Drill
				chip={'big frontend? the "smallest" preset'}
				verdict={<ClaimText claim={claims.buildChoice} />}
			>
				<p className="drill-p">
					<ClaimText claim={claims.sizePreset} />
				</p>
				<PresetRows />
				<p className="note">
					{
						"// these are other apps than Valibot's login form above, and their schemas have no custom messages or narrows; these results don't carry over to apps of forms, which we measured separately"
					}
				</p>
				<p className="drill-p">
					<ClaimText claim={claims.smallestSpeed} />{" "}
					<Link className="link" href="/docs/precompile/options">
						The options
					</Link>
				</p>
			</Drill>
		</Drills>
	</Point>
)

/** 03: cold start, as a boot log every library runs at once */
export const Startup = () => {
	const { zodRatio, valibotPercent, rivals, category } = startupFacts()
	const zod = rivals.find(bar => bar.name === "Zod")!
	const zodCompiled = rivals.find(bar => bar.name === "Zod (compiled)")
	return (
		<Point
			id="start"
			n="03"
			kicker="start"
			layout="split"
			stat={{
				value: zodRatio,
				unit: "less work to start than Zod 4, on a login app"
			}}
			title="Nothing to parse at startup."
			deck={
				<>
					<ClaimText claim={claims.noInit} /> On the same app, that's{" "}
					{valibotPercent}% less work than Valibot.
				</>
			}
			figure={<BootLog />}
			caveat={
				zodCompiled &&
				zodCompiled.value > zod.value && (
					<p className="loses">
						<b>Compiling Zod costs it startup.</b> Zod (compiled) ran{" "}
						{category.format(zodCompiled.value)} instructions to Zod's{" "}
						{category.format(zod.value)}.
					</p>
				)
			}
		>
			<Drills name="start" links={<Measured />}>
				{null}
			</Drills>
		</Point>
	)
}

/**
 * 04: the build step, as one beat. What it is, the line that adds it, and
 * what it promises: a validator that answers as the Type it replaces does,
 * and a build that stops, with the fix, on anything it can't precompile.
 * What the build writes, and the editor to try it in, are the docs'.
 */
export const Precompile = () => (
	<Point
		id="precompile"
		n="04"
		kicker="precompile"
		layout="flip"
		title="Your type in. Plain JavaScript out."
		deck={
			<>
				One Vite plugin. No parser, no <code>new Function</code>. Your
				definitions don't change.
			</>
		}
		figure={<Guarantee />}
		aside={
			<div className="ctas point-ctas">
				<Link className="btn" href="/docs/precompile/setup">
					Set up precompile{" "}
					<span className="arrow" aria-hidden>
						→
					</span>
				</Link>
				<Link className="link" href="/docs/precompile#what-ships">
					see what it emits →
				</Link>
			</div>
		}
	>
		<Drills name="precompile">
			<Drill
				chip="what the build costs"
				verdict="A build takes longer: precompiling moves creating your Types from your program's startup to your build."
			>
				<p className="drill-p">
					<ClaimText claim={claims.buildTimeApp} />
				</p>
				<ul className="drill-list">
					<li>
						<ClaimText claim={claims.buildTimeProduction} />
					</li>
					<li>
						<ClaimText claim={claims.buildTimeMedium} />
					</li>
				</ul>
				<p className="drill-p">
					<Link className="link" href="/docs/precompile#build-time">
						Dev servers and watch mode
					</Link>
				</p>
			</Drill>
			<Drill
				chip="what it can't do"
				verdict="A precompiled validator doesn't compose or introspect at runtime."
			>
				<p className="drill-p">
					It validates, asserts and implements Standard Schema as the Type it
					replaces does, and lacks methods like <code>.and</code> and{" "}
					<code>.extends</code>. The build fails wherever it sees your program
					rely on what a validator lacks. If you need the whole Type API at
					runtime, build with <code>runtime: "arktype"</code>.{" "}
					<Link className="link" href="/docs/precompile/dynamic-vs-precompiled">
						Dynamic vs precompiled
					</Link>
				</p>
			</Drill>
		</Drills>
	</Point>
)
