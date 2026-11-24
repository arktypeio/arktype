import type { CSSProperties } from "react"
import { medianOf } from "../../lib/claims.ts"
import { categoryOf, incumbent } from "./boardFacts.ts"

type CountLane = {
	name: string
	/** how many times ArkType's time per call the library's is, at the median scenario */
	ratio: number
	/** the ratio as the claims state it: "15×" */
	text: string
	ours: boolean
}

/** validations a second ArkType's counter runs at; every other lane's is this over its ratio */
const rate = 150

/** what ArkType's count reads where nothing moves: the others are theirs in the same time */
const still = 1000

/**
 * ArkType and each library the board compares it to, at that library's
 * median ratio across every scenario of the homepage's benchmark. The ratio
 * is read back from the text lib/claims.ts states, so a counter never runs
 * at a number the page doesn't print.
 */
const lanes = (): CountLane[] => [
	{ name: "ArkType", ratio: 1, text: "1×", ours: true },
	...categoryOf("speed")
		.versus.map(({ name, versus }) => ({
			name,
			ratio: parseFloat(medianOf(versus)),
			text: medianOf(versus),
			ours: false
		}))
		.sort((l, r) => l.ratio - r.ratio)
]

/**
 * Validations finished since the page loaded, each library's
 * counter running at its median speed relative to ArkType's. HomeEffects
 * runs the counters, stops painting them off screen and wires the button that
 * pauses them. Where nothing moves, the markup is the same comparison at rest:
 * what each library validates in the time ArkType validates a thousand.
 */
export const SpeedCount = () => {
	const all = lanes()
	const { count } = categoryOf("speed").versus[0].versus
	return (
		<figure
			className="count"
			data-stage="count"
			data-rate={rate}
			aria-label={`Validations finished in the time precompiled ArkType finishes ${still.toLocaleString("en-US")}, each library at its median time per call across ${count} scenarios: ${all
				.filter(lane => !lane.ours)
				.map(
					lane =>
						`${lane.name} ${Math.floor(still / lane.ratio).toLocaleString("en-US")}`
				)
				.join(", ")}`}
		>
			<div className="count-head">
				<span
					className="count-title"
					data-live="validated since the page loaded"
				>
					validated in the same time
				</span>
				<button className="count-toggle" type="button" aria-pressed="false">
					pause
				</button>
			</div>
			<ol>
				{all.map(lane => (
					<li
						key={lane.name}
						className={
							lane.ours ? "count-lane is-ours"
							: lane.name === incumbent ?
								"count-lane is-incumbent"
							:	"count-lane"
						}
						style={
							{
								"--ratio": lane.ratio,
								// a mark crosses the stream's pitch once per validation
								"--beat": `${(lane.ratio / rate).toFixed(4)}s`
							} as CSSProperties
						}
					>
						<span className="count-name">{lane.name}</span>
						<span className="count-num" data-ratio={lane.ratio} aria-hidden>
							{Math.floor(still / lane.ratio).toLocaleString("en-US")}
						</span>
						<span className="count-x">
							{lane.ours ? "precompiled" : `${lane.text} the time per call`}
						</span>
						<span className="count-stream" aria-hidden />
					</li>
				))}
			</ol>
			<figcaption>
				slowed to read · each library at its median across the {count} scenarios
			</figcaption>
		</figure>
	)
}
