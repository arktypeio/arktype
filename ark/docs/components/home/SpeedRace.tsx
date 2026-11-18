import type { CSSProperties } from "react"
import { medianOf } from "../../lib/claims.ts"
import { categoryOf } from "./boardFacts.ts"

type RaceLane = {
	name: string
	/** how many times ArkType's time per call the library's is, at the median scenario */
	ratio: number
	/** the ratio as the claims state it: "15×" */
	text: string
	ours: boolean
}

/**
 * Seconds ArkType's runner takes to cross its lane. Every other lane's takes
 * its ratio times as long, so at 15× a crossing is about five seconds.
 */
const lap = 0.34

/**
 * The share of a lane a runner's streak covers: ArkType's is long, as
 * anything that fast blurs, and a slow library's is a dot
 */
const streak = (ratio: number) => Math.max(0.03, 0.5 / ratio)

/**
 * ArkType and each library the board compares it to, at that library's
 * median ratio across every scenario of the homepage's benchmark. The ratio
 * is read back from the text lib/claims.ts states, so a lane never moves at
 * a number the page doesn't print.
 */
const lanes = (): RaceLane[] => [
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
 * A lap is one validation. Each runner crosses at its library's median
 * speed, and HomeEffects counts the laps as they finish and pauses the race
 * off screen. Without motion it reads as bars: each lane's fill is its
 * throughput relative to ArkType's.
 */
export const SpeedRace = () => {
	const all = lanes()
	const { count } = categoryOf("speed").versus[0].versus
	return (
		<figure
			className="laps"
			data-stage="laps"
			aria-label={`Time per validation relative to precompiled ArkType, at each library's median across ${count} scenarios: ${all
				.filter(lane => !lane.ours)
				.map(lane => `${lane.name} ${lane.text}`)
				.join(", ")}`}
		>
			<div className="laps-head" aria-hidden>
				<span>library</span>
				<span>laps</span>
				<span>time per call</span>
			</div>
			<ol>
				{all.map(lane => (
					<li
						key={lane.name}
						className={lane.ours ? "lap-lane is-ours" : "lap-lane"}
						style={
							{
								"--ratio": lane.ratio,
								"--lap": `${(lap * lane.ratio).toFixed(3)}s`,
								"--streak": streak(lane.ratio).toFixed(3)
							} as CSSProperties
						}
					>
						<span className="lap-name">{lane.name}</span>
						<span className="lap-track">
							<span className="lap-fill" />
							<span className="lap-runner" />
						</span>
						<span
							className="lap-count"
							data-lap={(lap * lane.ratio).toFixed(3)}
							aria-hidden
						/>
						<span className="lap-x">{lane.text}</span>
					</li>
				))}
			</ol>
			<figcaption>
				one lap = one validation · each library at its median across the {count}{" "}
				scenarios · precompiled ArkType = 1×
			</figcaption>
		</figure>
	)
}
