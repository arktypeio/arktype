import Link from "next/link"
import type { ReactNode } from "react"
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
import { Drill, Drills, Point, Stat } from "./Drill.tsx"
import { HomePrecompile } from "./HomePrecompile.tsx"
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

type ProofBodyProps = {
	statValue: string
	statUnit: ReactNode
	title: ReactNode
	deck: ReactNode
	figure: ReactNode
	caveat?: ReactNode
	children: ReactNode
}

/** one tab body inside the unified benchmark stage */
const ProofBody = ({
	statValue,
	statUnit,
	title,
	deck,
	figure,
	caveat,
	children
}: ProofBodyProps) => (
	<div className="proof-body">
		<div className="point-main">
			<div className="point-copy">
				<Stat value={statValue} unit={statUnit} />
				<div className="point-words">
					<h3>{title}</h3>
					<p className="deck">{deck}</p>
				</div>
			</div>
			<div className="point-figure">{figure}</div>
		</div>
		{caveat && <div className="point-caveat">{caveat}</div>}
		{children}
	</div>
)

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

/**
 * 02: all three deep-dive benchmark animations (Speed, Size, Startup) in one
 * tabbed stage so readers see every live animation and honest caveat without
 * scrolling through three separate benchmark walls. Hero stats (#run, #size,
 * #start) and board links (#loses) activate the matching tab and scroll here.
 */
export const ProofTabs = () => {
	const facts = benchFacts()
	const [zod, zodCompiled] = categoryOf("speed").versus
	const swept = zod.versus.wins === zod.versus.count
	const sweptCompiled = zodCompiled.versus.wins === zodCompiled.versus.count
	const sizeRatio = zodSizeRatio()
	const {
		zodRatio: startupRatio,
		valibotPercent,
		rivals,
		category
	} = startupFacts()
	const zodStartup = rivals.find(bar => bar.name === "Zod")!
	const zodCompiledStartup = rivals.find(bar => bar.name === "Zod (compiled)")

	return (
		<section
			className="block proof-stage"
			id="proof"
			aria-labelledby="proof-title"
			data-tabs="proof"
		>
			<div className="proof-head">
				<div>
					<div className="sec-label">
						<b>02</b>
						{"// live benchmarks"}
					</div>
					<h2 id="proof-title">Mind the gap.</h2>
				</div>
				<div
					className="stage-tabs proof-tabs"
					role="tablist"
					aria-label="Benchmark categories"
				>
					<button
						type="button"
						role="tab"
						className="stage-tab"
						id="proof-tab-run"
						aria-selected="true"
						aria-controls="run"
						data-tab="run"
					>
						<b>Speed</b>
						<span>{medianOf(zod.versus)} faster</span>
					</button>
					<button
						type="button"
						role="tab"
						className="stage-tab"
						id="proof-tab-size"
						aria-selected="false"
						aria-controls="size"
						tabIndex={-1}
						data-tab="size"
					>
						<b>Size</b>
						<span>{sizeRatio} smaller</span>
					</button>
					<button
						type="button"
						role="tab"
						className="stage-tab"
						id="proof-tab-start"
						aria-selected="false"
						aria-controls="start"
						tabIndex={-1}
						data-tab="start"
					>
						<b>Startup</b>
						<span>{startupRatio} fewer ops</span>
					</button>
				</div>
			</div>

			<div
				className="stage-panel"
				id="run"
				role="tabpanel"
				aria-labelledby="proof-tab-run"
				data-panel="run"
			>
				<ProofBody
					statValue={medianOf(zod.versus)}
					statUnit="faster than Zod 4, at the median scenario"
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
								{zodCompiled.versus.wins} of {zodCompiled.versus.count}, by a
								median of {medianOf(zodCompiled.versus)}.
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
								ajv) and the libraries you'd otherwise write schemas with (Zod
								4, compiled or not, and Valibot), on the same inputs.{" "}
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
				</ProofBody>
			</div>

			<div
				className="stage-panel"
				id="size"
				role="tabpanel"
				aria-labelledby="proof-tab-size"
				data-panel="size"
				data-closed=""
			>
				<ProofBody
					statValue={sizeRatio}
					statUnit="smaller than Zod 4, on Valibot's own login form"
					title="Ship the checks, not the parser."
					deck={`Valibot's own login form, messages included: ${loginKb("ArkType (precompiled)")} kB gzipped. Valibot ships ${loginKb("Valibot")}. Zod ships ${loginKb("Zod")}.`}
					figure={<ByteGrid />}
				>
					<Drills
						name="size"
						links={
							<>
								<Link
									className="drill-link"
									href="/docs/precompile/size-at-scale"
								>
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
				</ProofBody>
			</div>

			<div
				className="stage-panel"
				id="start"
				role="tabpanel"
				aria-labelledby="proof-tab-start"
				data-panel="start"
				data-closed=""
			>
				<ProofBody
					statValue={startupRatio}
					statUnit="fewer startup instructions than Zod 4, on a login app"
					title="Nothing to parse at startup."
					deck={
						<>
							<ClaimText claim={claims.noInit} /> On the same app, that's{" "}
							{valibotPercent}% fewer startup instructions than Valibot.
						</>
					}
					figure={<BootLog />}
					caveat={
						zodCompiledStartup &&
						zodCompiledStartup.value > zodStartup.value && (
							<p className="loses">
								<b>Compiling Zod costs it startup.</b> Zod (compiled) ran{" "}
								{category.format(zodCompiledStartup.value)} instructions to
								Zod's {category.format(zodStartup.value)}.
							</p>
						)
					}
				>
					<Drills name="start" links={<Measured />}>
						{null}
					</Drills>
				</ProofBody>
			</div>
		</section>
	)
}

/**
 * 03: @ark/aot live on the homepage. Shows the 2-line Vite plugin import,
 * interactive Type -> plain JS precompilation right in the browser, and the
 * verified build-refusal diagnostic one tab away.
 */
export const Precompile = () => (
	<Point
		id="precompile"
		n="03"
		kicker="@ark/aot"
		layout="flip"
		title="Your type in. Plain JavaScript out."
		deck={
			<>
				One plugin from <code>@ark/aot</code>. No parser, no{" "}
				<code>new Function</code>. Your definitions don't change.
			</>
		}
		figure={<HomePrecompile />}
		aside={
			<div className="aot-aside">
				<pre
					className="aot-snippet"
					aria-label="Adding @ark/aot to vite.config.ts"
				>
					<span className="aot-snippet-head">vite.config.ts</span>
					<code>
						<span className="diff-mark" aria-hidden>
							+
						</span>
						{'import { precompile } from "@ark/aot/unplugin"\n'}
						<span className="diff-mark" aria-hidden>
							+
						</span>
						{"plugins: [precompile.vite()]"}
					</code>
				</pre>
				<div className="ctas point-ctas">
					<Link className="btn" href="/docs/precompile/setup">
						Set up @ark/aot{" "}
						<span className="arrow" aria-hidden>
							→
						</span>
					</Link>
					<Link className="link" href="/docs/precompile">
						all bundlers &amp; Next.js{" "}
						<span className="arrow" aria-hidden>
							→
						</span>
					</Link>
				</div>
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
