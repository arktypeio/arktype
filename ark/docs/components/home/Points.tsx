import Link from "next/link"
import {
	benchFacts,
	benchNotes,
	preview,
	provenance,
	type BenchFacts
} from "../../lib/bench/bench.ts"
import { generatedRows } from "../../lib/bench/scoreboard.ts"
import { sizeCurves } from "../../lib/bench/sizeCurves.ts"
import {
	claims,
	isPending,
	medianOf,
	presetSizeRows,
	sizeChart
} from "../../lib/claims.ts"
import { BenchmarkChart } from "../mdx/BenchmarkChart.tsx"
import { ClaimText } from "../mdx/Claim.tsx"
import { AverageLine, SizeStandings, SpeedSpread } from "./Board.tsx"
import {
	categoryOf,
	loginKb,
	startupFacts,
	zodSizeRatio
} from "./boardFacts.ts"
import { BootLog } from "./BootLog.tsx"
import { ByteGrid } from "./ByteGrid.tsx"
import { Compile } from "./Compile.tsx"
import { Drill, Drills, Point } from "./Drill.tsx"
import { SizeCurveChart } from "./SizeCurveChart.tsx"
import { SpeedCount } from "./SpeedCount.tsx"
import { Loops, Proof, proofCount } from "./WhyNow.tsx"

/** the generated apps' sizes in Types, ascending */
const appTypes = [...new Set(generatedRows.map(row => Number(row.app)))].sort(
	(l, r) => l - r
)

/** "2 of 13 valid-data scenarios", or "all 13 scenarios" while no library is faster on any */
const validShare = (facts: BenchFacts) =>
	facts.mostFaster ?
		`${facts.mostFaster} of ${facts.validCount} valid-data scenarios`
	:	`all ${facts.validCount} scenarios`

type FactsProps = {
	facts: BenchFacts
}

/** a sourced number: hover or focus shows where it comes from */
const BenchSource = ({ facts }: FactsProps) => (
	<span className="tok twoslash-hover" tabIndex={0} data-qi="">
		{validShare(facts)}
		<span className="twoslash-popup-container" popover="manual">
			<code className="twoslash-popup-code">
				<span style={{ color: "var(--copper)" }}>const</span>
				<span style={{ color: "var(--ink)" }}> fasterThanArkType</span>
				<span style={{ color: "var(--copper)" }}>:</span>
				<span style={{ color: "var(--ink)" }}> {"{"}</span>
				{facts.fasterCounts.map(([library, rows], i) => (
					<span key={library}>
						{i > 0 && <span style={{ color: "var(--copper)" }}>;</span>}
						<span style={{ color: "var(--ink)" }}>
							{" "}
							{/^\w+$/.test(library) ? library : `"${library}"`}
						</span>
						<span style={{ color: "var(--copper)" }}>:</span>
						<span style={{ color: "var(--blue)" }}> {rows}</span>
					</span>
				))}
				<span style={{ color: "var(--ink)" }}> {"}"}</span>
			</code>
			<span className="qi-doc">
				{facts.mostFaster ?
					`Valid-data scenarios, of ${facts.validCount}, each library was faster on: ${facts.mostFasterBy}${facts.fasterOthers && `; ${facts.fasterOthers}`}. `
				:	""}
				ArkType was fastest in {facts.validWins}
				{facts.ties && ` and tied ${facts.ties}`}. Median ns per call over{" "}
				{provenance.passes} fresh-process passes against typia, TypeBox, ajv,
				Zod 4 (compiled or not), zod/mini and Valibot; faster means a sign test
				at p {"<"} .05. Reporting errors on invalid data, ajv is faster in{" "}
				{facts.ajvFasterCount === facts.errorCount ?
					"every row"
				:	`${facts.ajvFasterCount} of ${facts.errorCount} rows`}
				.
			</span>
			{preview && (
				<span className="qi-foot">
					<span>as of · {provenance.date}</span>
					<span>precompile {provenance.commit}</span>
				</span>
			)}
		</span>
	</span>
)

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

/** 02: the build step, as the plugin, a definition and what the build makes of it */
export const Precompile = () => (
	<Point
		id="precompile"
		n="02"
		kicker="precompile"
		title="Your type in. Plain JavaScript out."
		deck={
			<>
				One Vite plugin. No parser, no <code>new Function</code>. Your
				definitions don't change.
			</>
		}
		figure={<Compile />}
		aside={
			<div className="ctas point-ctas">
				<Link className="btn" href="/docs/precompile/setup">
					Set up precompile{" "}
					<span className="arrow" aria-hidden>
						→
					</span>
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
						<ClaimText claim={claims.buildTimeDev} />
					</li>
					<li>
						<ClaimText claim={claims.buildTimeWatch} />
					</li>
					<li>
						<ClaimText claim={claims.buildTimeMedium} />
					</li>
				</ul>
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
			<Drill
				chip="how we know it's right"
				verdict={`${proofCount} suites every change to the output has to agree with.`}
			>
				<Proof />
			</Drill>
			<Drill
				id="why"
				chip="why a build step now"
				verdict="Agents don't mind a build step."
			>
				<Loops />
			</Drill>
		</Drills>
	</Point>
)

/** 03: validation speed, as validations finished at each library's median */
export const Speed = () => {
	const facts = benchFacts()
	const [zod, zodCompiled] = categoryOf("speed").versus
	const swept = zod.versus.wins === zod.versus.count
	const sweptCompiled = zodCompiled.versus.wins === zodCompiled.versus.count
	return (
		<Point
			id="run"
			n="03"
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
			<Drills name="run">
				<Drill
					chip={`all ${zod.versus.count} scenarios`}
					verdict={
						swept ?
							"Each dot is a scenario. Against Zod 4, none is left of ArkType's line."
						:	"Each dot is a scenario, at its ratio to ArkType's time."
					}
				>
					<SpeedSpread />
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
						compiled or not, and Valibot), each in its own process, on the same
						inputs.{" "}
						{facts.mostFaster ?
							"On valid data, no other library was faster in more than "
						:	"On valid data, it was fastest or tied in "}
						<BenchSource facts={facts} />.
					</p>
					<Losses facts={facts} />
					<p className="note">
						{
							"// prefer no build step? dynamic ArkType runs the same definitions, "
						}
						<ClaimText claim={claims.dynamicSpec} />
					</p>
				</Drill>
				<Drill
					chip="whole apps"
					verdict={
						<>
							<AverageLine id="speed" />.
						</>
					}
				>
					<p className="drill-p">
						<ClaimText claim={claims.parseSafe} />
					</p>
					{!isPending(claims.appSpeed) && (
						<p className="drill-p">
							<ClaimText claim={claims.appSpeed} />
						</p>
					)}
					{!isPending(claims.bigApp) && (
						<p className="drill-p">
							<ClaimText claim={claims.bigApp} />
						</p>
					)}
				</Drill>
				<Drill
					chip="every panel, and the method"
					verdict={`${facts.scenarioCount} scenarios, the median of ${provenance.passes} fresh-process passes each.`}
				>
					<BenchmarkChart animate />
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
								<td key={i}>{size.replace(" KB", " kB")}</td>
							))}
						</tr>
					)
				})}
			</tbody>
		</table>
	</div>
)

/** 04: bundle size, as the blocks a precompiled build leaves behind */
export const Size = () => (
	<Point
		id="size"
		n="04"
		kicker="ship"
		layout="flip"
		stat={{
			value: zodSizeRatio(),
			unit: "smaller than Zod 4, on Valibot's own login form"
		}}
		title="Ship the checks, not the parser."
		deck={`Valibot's own login form, messages included: ${loginKb("ArkType (precompiled)")} kB gzipped. Valibot ships ${loginKb("Valibot")}. Zod ships ${loginKb("Zod")}.`}
		figure={<ByteGrid />}
		caveat={
			<p className="loses">
				<ClaimText claim={claims.sizeClose} />
			</p>
		}
	>
		<Drills name="size">
			<Drill
				chip="as your app grows"
				verdict="One login form is the fixed cost. As an app's Types grow, which library ships less depends on the build you choose and on what the schemas hold."
			>
				{sizeCurves.corpora.map(corpus => (
					<SizeCurveChart
						key={corpus.id}
						corpus={corpus}
						commit={sizeCurves.commit}
					/>
				))}
			</Drill>
			<Drill
				chip={'the "smallest" preset'}
				verdict={<ClaimText claim={claims.buildChoice} />}
			>
				<p className="drill-p">
					<ClaimText claim={claims.sizePreset} />
				</p>
				<PresetRows />
				<p className="note">
					{
						"// these are other apps than Valibot's login form above, measured on schemas without custom messages or narrows; form-like schemas are a separate corpus, and these results don't carry over to it"
					}
				</p>
				<p className="drill-p">
					<ClaimText claim={claims.smallestSpeed} />{" "}
					<Link className="link" href="/docs/precompile/options">
						The options
					</Link>
				</p>
			</Drill>
			<Drill
				chip="the close call"
				verdict={<ClaimText claim={claims.sizeAverage} />}
			>
				<p className="drill-p">
					<ClaimText claim={claims.leaveOneOut} />
				</p>
				<SizeStandings />
				<p className="drill-p">
					<ClaimText claim={claims.dynamicSize} />
				</p>
				<p className="note">
					{"// the blocks above: "}
					<ClaimText claim={sizeChart.detail} />
				</p>
			</Drill>
		</Drills>
	</Point>
)

/** 05: cold start, as a boot log every library runs at once */
export const Startup = () => {
	const facts = benchFacts()
	const { zodRatio, valibotPercent, rivals, category } = startupFacts()
	const zod = rivals.find(bar => bar.name === "Zod")!
	const zodCompiled = rivals.find(bar => bar.name === "Zod (compiled)")
	return (
		<Point
			id="start"
			n="05"
			kicker="start"
			layout="band"
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
			<Drills name="start">
				<Drill
					chip="every app we start"
					verdict="These count CPU instructions, which a busy machine doesn't move. They aren't seconds."
				>
					<p className="drill-p">
						<ClaimText claim={claims.startupApps} />
					</p>
					{!isPending(claims.appStartup) && (
						<p className="drill-p">
							On the apps we generated of {appTypes[0].toLocaleString("en-US")}{" "}
							to {appTypes.at(-1)!.toLocaleString("en-US")} Types, which the
							speed section's drill-down describes:{" "}
							<ClaimText claim={claims.appStartup} />
						</p>
					)}
				</Drill>
				<Drill
					chip="other projects' benchmarks"
					verdict={<ClaimText claim={claims.startupAverage} />}
				>
					<p className="drill-p">
						<ClaimText claim={claims.startupBasis} />
					</p>
				</Drill>
				<Drill
					chip="against ArkType's own JIT"
					verdict={`On valid data the precompiled build is ${facts.versusJit}. The bigger change is everything before the first call.`}
				>
					<dl className="facts">
						<div>
							<dt>cold start, login form app</dt>
							<dd>
								<b>{facts.coldStandalone}</b>
								<span>JIT {facts.coldJit}</span>
							</dd>
						</div>
						<div>
							<dt>shipped validator, gzip</dt>
							<dd>
								<b>{facts.sizeStandalone}</b>
								<span>JIT {facts.sizeJit}</span>
							</dd>
						</div>
						<div>
							<dt>parsing at startup</dt>
							<dd>
								<b>none</b>
								<span>
									no <code>new Function</code>, so it runs under strict CSP
								</span>
							</dd>
						</div>
					</dl>
					<p className="note">{`// ${benchNotes().at(-1)}`}</p>
				</Drill>
			</Drills>
		</Point>
	)
}
