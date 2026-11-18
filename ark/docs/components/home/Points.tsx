import Link from "next/link"
import {
	benchFacts,
	benchNotes,
	preview,
	provenance,
	type BenchFacts
} from "../../lib/bench/bench.ts"
import { sizeScale } from "../../lib/bench/sizeScale.ts"
import { claims, isPending, medianOf, sizeChart } from "../../lib/claims.ts"
import { BenchmarkChart } from "../mdx/BenchmarkChart.tsx"
import { ClaimText, PresetSizeTable } from "../mdx/Claim.tsx"
import { AverageLine, SizeStandings, SpeedSpread } from "./Board.tsx"
import { categoryOf, startupFacts } from "./boardFacts.ts"
import { ByteGrid } from "./ByteGrid.tsx"
import { ColdStart } from "./ColdStart.tsx"
import { Compile } from "./Compile.tsx"
import { Drill, Drills, Point } from "./Drill.tsx"
import { SizeScaleChart } from "./SizeScaleChart.tsx"
import { SpeedRace } from "./SpeedRace.tsx"
import { Loops, Proof, proofCount } from "./WhyNow.tsx"

export const NextTag = () =>
	preview && <span className="next-tag">next release</span>

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

/** 02: validation speed, as a race at each library's median */
export const Speed = () => {
	const facts = benchFacts()
	const [zod, zodCompiled] = categoryOf("speed").versus
	return (
		<Point
			id="run"
			n="02"
			kicker="run"
			tag={<NextTag />}
			layout="split"
			stat={{
				value: medianOf(zod.versus),
				unit: "faster than Zod 4, at the median scenario"
			}}
			title={
				<>
					Precompiled, it was <ClaimText claim={claims.zodSpec} />.
				</>
			}
			deck={
				<>
					And faster than Zod 4's <code>z.compile</code> in{" "}
					{zodCompiled.versus.wins} of {zodCompiled.versus.count}, by a median
					of {medianOf(zodCompiled.versus)}. Each lap is one validation.
				</>
			}
			figure={<SpeedRace />}
		>
			<Drills>
				<Drill
					title="Every scenario, as a dot"
					hint={`${zod.versus.count} scenarios against each library`}
				>
					<SpeedSpread />
				</Drill>
				<Drill
					title="Where ArkType isn't the fastest"
					hint="ajv, when the hot path reports errors"
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
					title="On whole apps, and other projects' benchmarks"
					hint="generated apps, ntwine, moltar"
				>
					<p className="drill-p">
						<AverageLine id="speed" />.
					</p>
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
					title="Every panel, the table and the method"
					hint={`${facts.scenarioCount} scenarios, ${provenance.passes} passes each`}
				>
					<BenchmarkChart animate />
				</Drill>
			</Drills>
		</Point>
	)
}

/** 03: cold start, as a sweep every library's bar grows along until it is ready */
export const Startup = () => {
	const facts = benchFacts()
	const { zodRatio, valibotPercent } = startupFacts()
	return (
		<Point
			id="start"
			n="03"
			kicker="start"
			tag={<NextTag />}
			layout="split"
			stat={{
				value: zodRatio,
				unit: "less startup work than Zod, on the login app"
			}}
			title="Nothing to parse at startup."
			deck={
				<>
					<ClaimText claim={claims.noInit} /> On the same app, that's{" "}
					{valibotPercent}% less work than Valibot.
				</>
			}
			figure={<ColdStart />}
		>
			<Drills>
				<Drill
					title="Every app we start, against every library"
					hint="instructions, not seconds"
				>
					<p className="drill-p">
						<ClaimText claim={claims.startupApps} />
					</p>
					{!isPending(claims.appStartup) && (
						<p className="drill-p">
							<ClaimText claim={claims.appStartup} />
						</p>
					)}
					<p className="note">
						{
							"// these count instructions, which a busy machine doesn't move; they aren't seconds"
						}
					</p>
				</Drill>
				<Drill
					title="What the independent benchmarks time"
					hint="creating a schema"
				>
					<p className="drill-p">
						<AverageLine id="startup" />.
					</p>
					<p className="drill-p">
						<ClaimText claim={claims.startupBasis} />
					</p>
				</Drill>
				<Drill
					title="Against ArkType's own JIT"
					hint="what precompiling removes"
				>
					<p className="drill-p">
						On valid data the precompiled build is {facts.versusJit}. The bigger
						change is everything before the first call.
					</p>
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

/** 04: bundle size, as the blocks a precompiled build leaves behind */
export const Size = () => (
	<Point
		id="size"
		n="04"
		kicker="ship"
		tag={<NextTag />}
		layout="split"
		title="Ship the checks, not the parser."
		deck={<ClaimText claim={claims.loginSize} />}
		figure={<ByteGrid />}
	>
		<Drills>
			<Drill
				title="As your app grows"
				hint="where each build stops being the smaller"
			>
				<SizeScaleChart scale={sizeScale} />
				{!isPending(claims.appSize) && (
					<p className="drill-p">
						<ClaimText claim={claims.appSize} />
					</p>
				)}
			</Drill>
			<Drill
				title='The "smallest" preset, and what it costs'
				hint="bytes for speed"
			>
				<p className="drill-p">
					<ClaimText claim={claims.buildChoice} />{" "}
					<ClaimText claim={claims.sizePreset} />
				</p>
				<PresetSizeTable />
				<p className="drill-p">
					<ClaimText claim={claims.smallestSpeed} />{" "}
					<Link className="link" href="/docs/precompile/options">
						The options
					</Link>
				</p>
			</Drill>
			<Drill title="The close call" hint="size is the close one">
				<p className="drill-p">
					<ClaimText claim={claims.sizeAverage} />{" "}
					<ClaimText claim={claims.sizeClose} />{" "}
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

/** 05: the build step, as a definition and what the build makes of it */
export const Precompile = () => (
	<Point
		id="precompile"
		n="05"
		kicker="precompile"
		tag={<NextTag />}
		title={
			<>
				One plugin.{" "}
				<span className="hl" id="why">
					Agents don't mind a build step.
				</span>
			</>
		}
		deck="Precompiled validators have always been faster and smaller. What they cost was a build step, and your agent runs that now. Your definitions don't change."
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
		<Drills>
			<Drill title="What the build costs" hint="build time, measured">
				<p className="drill-p">
					Precompiling moves creating your Types from your program's startup to
					your build, so a build takes longer.{" "}
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
				title="What a precompiled validator can't do"
				hint="compose or introspect at runtime"
			>
				<p className="drill-p">
					A standalone validator validates, asserts and implements Standard
					Schema as the Type it replaces does. It doesn't compose or introspect:
					it lacks methods like <code>.and</code> and <code>.extends</code>. The
					build fails wherever it sees your program rely on what a validator
					lacks. If you need the whole Type API at runtime, build with{" "}
					<code>runtime: "arktype"</code>.{" "}
					<Link className="link" href="/docs/precompile/dynamic-vs-precompiled">
						Dynamic vs precompiled
					</Link>
				</p>
			</Drill>
			<Drill
				title="How we know the output is right"
				hint={`${proofCount} suites it has to agree with`}
			>
				<Proof />
			</Drill>
			<Drill title="Why a build step is fine now" hint="whose loop it taxes">
				<Loops />
			</Drill>
		</Drills>
	</Point>
)
