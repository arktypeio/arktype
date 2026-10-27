import { Fragment, type CSSProperties } from "react"
import { formatRatio } from "../../lib/bench/bench.ts"
import { wellKnownRule } from "../../lib/bench/leaderboard.ts"
import {
	averageText,
	categories,
	claims,
	draftOf,
	headlineMethod,
	isPending,
	leadsEvery,
	medianOf,
	standingsAsOf,
	tieMargin,
	type BarCategory,
	type Category,
	type SpreadCategory,
	type StandingCategory
} from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { CheckIcon } from "./icons.tsx"

/**
 * Seconds: a startup bar snaps on after a wait in proportion to its cost, so
 * the cheapest is first; size bars start full width and pack down one by one.
 * `length` is home.css's snap or pack duration.
 */
const snap = { wait: 1.2, length: 0.24 }
const pack = { stagger: 0.05, length: 0.75 }

/** a scenario's dot, and the closest two dots' centers may come, in px */
const dot = { size: 5.5, clear: 6.5 }

/** px between a swarm's rows: dots in adjacent rows may sit closer side by side */
const pitch = dot.clear * 0.86

/** the narrowest the spread's track is drawn, so dots dodged at it never overlap wider */
const narrowest = 285

const ratioTicks = [0.1, 0.3, 1, 3, 10, 30, 100, 300, 1000]

/** a log axis from just left of 1× (or the fastest rival) to the first tick past the slowest */
const spreadAxis = (ratios: number[]) => {
	const min = Math.log10(Math.min(1, ...ratios) / 1.25)
	const max = Math.log10(ratioTicks.find(t => t >= Math.max(...ratios))!)
	const x = (ratio: number) => (Math.log10(ratio) - min) / (max - min)
	return {
		x,
		ticks: ratioTicks.filter(t => x(t) >= 0 && x(t) <= 1)
	}
}

/**
 * Each dot's row in a beeswarm: on the axis if it clears every dot placed
 * so far, else the nearest row above or below that does.
 */
const dodge = (xs: number[]) => {
	const rows: number[] = []
	const placed: { px: number; row: number }[] = []
	const byX = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b])
	for (const i of byX) {
		const px = xs[i] * narrowest
		for (let n = 0; rows[i] === undefined; n++) {
			const row = n % 2 ? (n + 1) / 2 : -n / 2
			const clears = placed.every(
				p => (p.px - px) ** 2 + ((p.row - row) * pitch) ** 2 >= dot.clear ** 2
			)
			if (!clears) continue
			rows[i] = row
			placed.push({ px, row })
		}
	}
	return rows
}

/**
 * Seconds: ArkType's 1× line draws, then each library's dots race in from
 * the right, a dot taking longer the farther it comes, so the ones nearest
 * ArkType land last.
 */
const spreadTiming = {
	start: 0.5,
	perLane: 0.12,
	jitter: 0.03,
	travel: 0.35,
	perTrack: 0.55
}

const verdictOf = (name: string, speedup: number, verdict: string) =>
	verdict === "tie" ? "a tie"
	: verdict === "win" ? `ArkType ${formatRatio(speedup)} faster`
	: `${name} ${formatRatio(1 / speedup)} faster`

const round = (n: number) => Math.round(n * 1000) / 1000

/** the big number, counted up to by HomeEffects in its own precision */
const Big = ({ value, unit }: { value: string; unit: string }) => {
	const [, digits, suffix] = /^([\d.]+)(.*)$/.exec(value)!
	return (
		<p className="card-big">
			<span
				className="card-num"
				data-to={digits}
				data-decimals={digits.split(".")[1]?.length ?? 0}
				data-suffix={suffix}
			>
				{value}
			</span>
			<span className="card-unit">{unit}</span>
		</p>
	)
}

/** ArkType's place by best average, the same in every card so "Pick 3" reads at a glance */
const Place = ({ category }: { category: Category }) => (
	<Big value={category.place} unit={`of ${category.ranked} libraries`} />
)

const Head = ({ category }: { category: Category }) => (
	<header className="card-head">
		{category.leads && (
			<span className="card-check" aria-hidden>
				<CheckIcon />
			</span>
		)}
		<h3 id={`card-${category.id}`} className="card-label">
			{category.label}
		</h3>
	</header>
)

const Foot = ({ category }: { category: Category }) => (
	<footer className="card-foot">
		<a
			className="card-src"
			href={category.source.href}
			{...(category.source.href.startsWith("#") ?
				{}
			:	{ target: "_blank", rel: "noreferrer" })}
		>
			{category.source.label}
		</a>
	</footer>
)

/** a best average, as a multiple of the best result: "1.252×" */
const multiple = (score: number) => `${averageText(score)}×`

/**
 * ArkType's best average beside the next best's and how far below it, or the
 * leader's where ArkType isn't first, within the band or not, then the best
 * named library's where the site doesn't name that one
 */
const Average = ({ category, of }: { category: Category; of: string }) => {
	const { score, other, named } = category.average
	const shown = other === named
	const others = shown ? `${other.library}'s` : "the best's"
	return (
		<>
			{category.leads && !category.ties ?
				<>
					Lowest average: <b>{multiple(score)}</b> {of}, <b>{category.by}</b>{" "}
					below{" "}
					{shown ?
						<>
							{others} <b>{multiple(other.score)}</b>
						</>
					:	"the next best's"}
				</>
			:	<>
					{category.ties ?
						`Within ${tieMargin} of ${shown ? `${other.library}'s average` : "the best average"}: `
					:	`${shown ? `${other.library}'s average` : "The best average"} is lower: `
					}
					<b>{multiple(score)}</b> {of}, to {others}{" "}
					<b>{multiple(other.score)}</b>
				</>
			}
			{!shown && (
				<>
					. Best rival with {wellKnownRule}: {named.library}'s{" "}
					<b>{multiple(named.score)}</b>
				</>
			)}
		</>
	)
}

const BarCard = ({ category }: { category: BarCategory }) => {
	const [ours, ...rivals] = category.bars.map(bar => ({
		name: bar.name,
		value: bar.value!
	}))
	const zod = rivals.find(bar => bar.name === "Zod")!
	const valibot = rivals.find(bar => bar.name === "Valibot")!
	const axis = Math.max(ours.value, ...rivals.map(bar => bar.value))
	const width = (value: number) => (value / axis) * 100
	// truncated, so no margin is ever rounded up
	const percent = Math.floor((1 - ours.value / valibot.value) * 100)
	return (
		<>
			<Place category={category} />
			<div className="card-margin">
				<p>
					<b>{formatRatio(zod.value / ours.value)}</b> {category.margin} Zod and{" "}
					<b>{percent}%</b> less than Valibot on the login app
				</p>
				<p>
					<Average category={category} of="the least work" />
				</p>
			</div>
			<ol
				className="race"
				aria-label={`${category.unit}, lower is better`}
				style={
					{
						"--won": `${(snap.wait * width(ours.value)) / 100 + snap.length}s`
					} as CSSProperties
				}
			>
				{[ours, ...rivals].map(bar => (
					<li
						key={bar.name}
						className={bar === ours ? "lane is-ours" : "lane"}
						style={
							{
								"--w": width(bar.value) / 100,
								"--at": `${(snap.wait * width(bar.value)) / 100}s`
							} as CSSProperties
						}
					>
						<span className="lane-name">
							{bar === ours ? "ArkType" : bar.name}
						</span>
						<span className="lane-track">
							<span className="lane-bar" />
						</span>
						<span className="lane-val">{category.format(bar.value)}</span>
					</li>
				))}
			</ol>
			<p className="card-rest">{category.unit}, lower is better</p>
		</>
	)
}

const SpreadCard = ({ category }: { category: SpreadCategory }) => {
	const [zod] = category.versus
	const axis = spreadAxis(
		category.versus.flatMap(({ versus }) => versus.rows.map(r => r.speedup))
	)
	const lanes = category.versus.map(({ name, versus }) => {
		const xs = versus.rows.map(r => axis.x(r.speedup))
		return { name, versus, xs, rows: dodge(xs) }
	})
	return (
		<>
			<Place category={category} />
			<div className="card-margin">
				<p>
					<b>
						{zod.versus.wins}/{zod.versus.count}
					</b>{" "}
					scenarios faster than Zod, by a median of{" "}
					<b>{medianOf(zod.versus)}</b>
				</p>
				<p>
					<Average category={category} of="the fastest result" />
				</p>
			</div>
			<div className="spread-plot">
				<ol
					className="race spread"
					aria-label="How many times slower than ArkType each library was, one dot per scenario, on a log scale"
					style={
						{
							"--one": round(axis.x(1)),
							"--pitch": `${round(pitch)}px`,
							"--dot": `${dot.size}px`
						} as CSSProperties
					}
				>
					{lanes.map(({ name, versus, xs, rows }, lane) => {
						const start = spreadTiming.start + lane * spreadTiming.perLane
						return (
							<li
								key={name}
								className="lane"
								style={
									{
										"--lane": lane,
										"--above": -Math.min(...rows),
										"--below": Math.max(...rows)
									} as CSSProperties
								}
							>
								<span className="lane-name">{name}</span>
								<span className="lane-val" data-wins={versus.wins}>
									{versus.wins}/{versus.count}
								</span>
								<span className="lane-track">
									{versus.rows.map((scenario, i) => (
										<span
											key={scenario.name}
											className={`spot is-${scenario.verdict}`}
											data-name={scenario.name}
											data-ns={`${name} ${scenario.ns}\nArkType ${scenario.oursNs}`}
											data-verdict={verdictOf(
												name,
												scenario.speedup,
												scenario.verdict
											)}
											style={
												{
													"--x": round(xs[i]),
													"--y": rows[i],
													"--delay": `${round(start + (i % 5) * spreadTiming.jitter)}s`,
													"--travel": `${round(spreadTiming.travel + spreadTiming.perTrack * (1 - xs[i]))}s`
												} as CSSProperties
											}
										/>
									))}
								</span>
							</li>
						)
					})}
				</ol>
				<div className="spread-axis" aria-hidden>
					{axis.ticks.map(tick => (
						<span
							key={tick}
							className={tick === 1 ? "tick is-one" : "tick"}
							style={{ "--x": round(axis.x(tick)) } as CSSProperties}
						>
							{tick}×
						</span>
					))}
				</div>
				<p className="spot-tip" role="tooltip" hidden />
			</div>
			<p className="card-rest">
				<span className="spread-key">
					<span className="key-one">ArkType, 1×</span>
					<span className="key-dot">a scenario</span>
				</span>
				how many times slower than ArkType · log scale
			</p>
		</>
	)
}

const StandingCard = ({ category }: { category: StandingCategory }) => {
	const ours = category.standings.findIndex(s => s.library === "ArkType")
	const axis = Math.max(...category.standings.map(s => s.score))
	return (
		<>
			<Place category={category} />
			<div className="card-margin">
				<p>
					<Average category={category} of="the smallest bundle" />
				</p>
				{!isPending(claims.sizePreset) && <p>{claims.sizePreset}</p>}
			</div>
			<ol
				className="race"
				aria-label="each library's bundles as a multiple of the smallest, averaged, lower is better"
				style={
					{
						"--won": `${pack.stagger * ours + pack.length}s`
					} as CSSProperties
				}
			>
				{category.standings.map((s, i) => (
					<li
						key={s.library}
						className={i === ours ? "lane is-ours" : "lane"}
						style={
							{
								"--w": s.score / axis,
								"--at": `${pack.stagger * i}s`
							} as CSSProperties
						}
					>
						<span className="lane-name">{s.library}</span>
						<span className="lane-track">
							<span className="lane-bar" />
						</span>
						<span className="lane-val">{multiple(s.score)}</span>
					</li>
				))}
			</ol>
			<p className="card-rest">
				1× = the smallest bundle everywhere · lower is better
				{category.omits && ` · libraries with ${wellKnownRule}`}
			</p>
		</>
	)
}

const pickTwo = "Pick 2."

/** the title's sentences, the trade-off it ends struck out before "Pick 3" */
const titlePhrases = () => {
	const phrases = draftOf(claims.boardTitle).split(/(?<=\.) /)
	return leadsEvery ?
			[...phrases.slice(0, -1), pickTwo, ...phrases.slice(-1)]
		:	phrases
}

/** ArkType's place in each category, then each against Zod and Valibot, every number from lib/claims.ts */
export const Board = () => (
	<section
		className="board"
		id="board"
		aria-labelledby="board-title"
		data-board
	>
		<div className="board-head">
			<div className="sec-label">
				<b>{"//"}</b>
				the scoreboard
			</div>
			<h2
				id="board-title"
				className={isPending(claims.boardTitle) ? "pending-claim" : undefined}
			>
				{titlePhrases().map((phrase, i) => (
					<Fragment key={phrase}>
						{i > 0 && " "}
						<span
							className="phrase"
							style={{ "--i": i } as CSSProperties}
							aria-hidden={phrase === pickTwo || undefined}
						>
							{phrase === pickTwo ?
								<s>{phrase}</s>
							:	phrase}
						</span>
					</Fragment>
				))}
			</h2>
		</div>
		<div className="cards">
			{categories.map((category, i) => (
				<article
					key={category.id}
					className={`card is-${category.id}`}
					style={{ "--i": i } as CSSProperties}
					aria-labelledby={`card-${category.id}`}
				>
					<Head category={category} />
					{category.id === "speed" ?
						<SpreadCard category={category} />
					: category.id === "size" ?
						<StandingCard category={category} />
					:	<BarCard category={category} />}
					<Foot category={category} />
				</article>
			))}
		</div>
		<p id="board-note" className="board-note">
			<ClaimText claim={claims.boardNote} />{" "}
			<time dateTime={standingsAsOf.date}>{standingsAsOf.text}</time>{" "}
			<a href={headlineMethod.href} target="_blank" rel="noreferrer">
				{headlineMethod.label} ↗
			</a>
		</p>
	</section>
)
