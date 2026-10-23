import { Fragment, type CSSProperties } from "react"
import {
	categories,
	claims,
	draftOf,
	isPending,
	oneBuild,
	type BenchmarkBar,
	type Category
} from "../../lib/claims.ts"
import { ClaimText, HeadlineNote } from "../mdx/Claim.tsx"
import { CheckIcon } from "./icons.tsx"

/** bars drawn per card: ArkType and the nearest rivals; the rest are listed */
const drawn = 4

/** a bar this many times the next one's length runs off the end */
const reach = 2.2

/** seconds the longest bar takes to grow, so the shortest finishes first */
const race = 1.8

type Bar = BenchmarkBar & { value: number }

const Card = ({ category, index }: { category: Category; index: number }) => {
	const bars = category.chart.bars.filter(
		(bar): bar is Bar => bar.kind !== "dynamic" && bar.value !== null
	)
	const ours = bars.find(bar => bar.kind === "precompiled")!
	const rivals = bars
		.filter(bar => bar !== ours)
		.sort((a, b) => a.value - b.value)
	const next = rivals[0]
	const shown = [ours, ...rivals.slice(0, drawn - 1)]
	const listed = rivals.slice(drawn - 1)
	const axis = Math.min(
		Math.max(...shown.map(bar => bar.value)),
		next.value * reach
	)
	const big = category.format(ours.value)
	// what HomeEffects counts up to, in the shown value's precision
	const [, digits, suffix] = /^([\d.]+)(.*)$/.exec(big.value)!
	// truncated, so the margin is never rounded up
	const margin = Math.floor((1 - ours.value / next.value) * 100)
	const lane = (value: number) => (Math.min(value, axis) / axis) * 100
	return (
		<article
			className={`card is-${category.id}`}
			style={
				{
					"--i": index,
					"--won": `${(race * lane(ours.value)) / 100}s`
				} as CSSProperties
			}
			aria-labelledby={`card-${category.id}`}
		>
			<header className="card-head">
				<span className="card-check" aria-hidden>
					<CheckIcon />
				</span>
				<h3 id={`card-${category.id}`} className="card-label">
					{category.label}
				</h3>
				<span className="card-build">{category.build}</span>
			</header>
			<p className="card-big">
				<span
					className="card-num"
					data-to={digits}
					data-decimals={digits.split(".")[1]?.length ?? 0}
					data-suffix={suffix}
				>
					{big.value}
				</span>
				<span className="card-unit">{big.unit}</span>
			</p>
			<p className="card-margin">
				<b>{margin}%</b> {category.margin} {next.name}
			</p>
			<ol
				className="race"
				aria-label={`${category.chart.unit}, lower is better`}
			>
				{shown.map(bar => {
					const width = lane(bar.value)
					return (
						<li
							key={bar.name}
							className={bar === ours ? "lane is-ours" : "lane"}
							style={{ "--w": width / 100 } as CSSProperties}
						>
							<span className="lane-name">
								{bar === ours ? "ArkType" : bar.name}
							</span>
							<span className="lane-track">
								<span
									className={
										bar.value > axis ? "lane-bar is-clipped" : "lane-bar"
									}
									style={{ "--d": `${(race * width) / 100}s` } as CSSProperties}
								/>
							</span>
							<span className="lane-val">
								{category.format(bar.value).value}
							</span>
						</li>
					)
				})}
			</ol>
			<p className="card-rest">
				{listed
					.map(bar => `${bar.name} ${category.format(bar.value).value}`)
					.join(" · ")}
			</p>
			<p className="card-claim">
				<ClaimText claim={category.claim} />
			</p>
			<footer className="card-foot">
				<a
					className="card-src"
					href={category.chart.source.href}
					target="_blank"
					rel="noreferrer"
				>
					{category.chart.source.label}
				</a>
			</footer>
		</article>
	)
}

/** a measured win in each category, every number from lib/claims.ts */
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
				precompiled, measured
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
				<Card key={category.id} category={category} index={i} />
			))}
		</div>
		<HeadlineNote className="note board-note" />
	</section>
)
