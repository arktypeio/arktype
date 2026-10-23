import { Fragment, type CSSProperties } from "react"
import { formatRatio } from "../../lib/bench/bench.ts"
import {
	categories,
	claims,
	draftOf,
	isPending,
	oneBuild,
	type BarCategory,
	type Category,
	type SpreadCategory
} from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { CheckIcon } from "./icons.tsx"

/** seconds the longest bar takes to grow, so the shortest finishes first */
const race = 1.8

/** the spread's log axis, as ratios to ArkType's time */
const spread = { min: 0.2, max: 300, ticks: [1, 10, 100] }

const spreadX = (ratio: number) =>
	((Math.log10(ratio) - Math.log10(spread.min)) /
		(Math.log10(spread.max) - Math.log10(spread.min))) *
	100

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

const Head = ({ category }: { category: Category }) => (
	<header className="card-head">
		<span className="card-check" aria-hidden>
			<CheckIcon />
		</span>
		<h3 id={`card-${category.id}`} className="card-label">
			{category.label}
		</h3>
		<span className="card-build">{category.build}</span>
	</header>
)

const Foot = ({ category }: { category: Category }) => (
	<>
		<p className="card-claim">
			<ClaimText claim={category.claim} />
		</p>
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
	</>
)

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
			<Big
				value={formatRatio(zod.value / ours.value)}
				unit={`${category.margin} Zod`}
			/>
			<p className="card-margin">
				{category.format(ours.value)} against Zod's {category.format(zod.value)}
				, and <b>{percent}%</b> {category.margin} Valibot
			</p>
			<ol
				className="race"
				aria-label={`${category.unit}, lower is better`}
				style={
					{ "--won": `${(race * width(ours.value)) / 100}s` } as CSSProperties
				}
			>
				{[ours, ...rivals].map(bar => (
					<li
						key={bar.name}
						className={bar === ours ? "lane is-ours" : "lane"}
						style={{ "--w": width(bar.value) / 100 } as CSSProperties}
					>
						<span className="lane-name">
							{bar === ours ? "ArkType" : bar.name}
						</span>
						<span className="lane-track">
							<span
								className="lane-bar"
								style={
									{
										"--d": `${(race * width(bar.value)) / 100}s`
									} as CSSProperties
								}
							/>
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
	return (
		<>
			<Big
				value={`${zod.versus.wins}/${zod.versus.count}`}
				unit="scenarios faster than Zod"
			/>
			<p className="card-margin">
				by <b>{zod.versus.min}</b> to <b>{zod.versus.max}</b>, scenario by
				scenario
			</p>
			<ol
				className="race spread"
				aria-label="Each library's time per call over ArkType's, one dot per scenario, on a log scale"
				style={{ "--one": spreadX(1) / 100 } as CSSProperties}
			>
				{category.versus.map(({ name, versus }, row) => (
					<li key={name} className="lane">
						<span className="lane-name">{name}</span>
						<span className="lane-track">
							{versus.rows.map((scenario, i) => (
								<span
									key={scenario.name}
									className={`spot is-${scenario.verdict}`}
									title={`${scenario.name}: ${
										scenario.speedup >= 1 ?
											`ArkType ${formatRatio(scenario.speedup)} faster`
										:	`${name} ${formatRatio(1 / scenario.speedup)} faster`
									}`}
									style={
										{
											"--x": spreadX(scenario.speedup) / 100,
											"--k": row * 3 + (i % 6)
										} as CSSProperties
									}
								/>
							))}
						</span>
						<span className="lane-val">
							{versus.wins}/{versus.count}
						</span>
					</li>
				))}
				<li className="lane ticks" aria-hidden>
					<span />
					<span className="lane-track">
						{spread.ticks.map(tick => (
							<span
								key={tick}
								className={tick === 1 ? "tick is-one" : "tick"}
								style={{ "--x": spreadX(tick) / 100 } as CSSProperties}
							>
								{tick}×
							</span>
						))}
					</span>
					<span />
				</li>
			</ol>
			<p className="card-rest">
				time per call over ArkType's · one dot per scenario · log scale
			</p>
		</>
	)
}

/** each category against Zod and Valibot, every number from lib/claims.ts */
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
				against Zod and Valibot
			</div>
			<h2
				id="board-title"
				className={isPending(claims.boardTitle) ? "pending-claim" : undefined}
			>
				{draftOf(claims.boardTitle)
					.split(/(?<=\.) /)
					.map((phrase, i) => (
						<Fragment key={phrase}>
							{i > 0 && " "}
							<span className="phrase" style={{ "--i": i } as CSSProperties}>
								{phrase}
							</span>
						</Fragment>
					))}
			</h2>
			{oneBuild && <span className="stamp">one build</span>}
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
					:	<BarCard category={category} />}
					<Foot category={category} />
				</article>
			))}
		</div>
	</section>
)
