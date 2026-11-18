import type { CSSProperties } from "react"
import { incumbent, speedBars } from "./boardFacts.ts"

/**
 * Every scenario of the homepage's benchmark, a library a bar: how many
 * times ArkType's time per call its is at the median scenario, with the
 * closest scenario, the farthest and how many it lost written under it. The
 * bar is the median and nothing else, on a linear axis from zero, so it
 * reads like every other bar on the page; the spread is the two numbers.
 */
export const SpeedBars = () => {
	const bars = speedBars()
	const longest = Math.max(...bars.map(bar => bar.median))
	const { of } = bars[0]
	return (
		<figure className="card is-solo is-medians">
			<ol
				className="race"
				aria-label={`How many times slower than precompiled ArkType each library was at the median of ${of} scenarios`}
			>
				<li
					className="lane is-ours"
					style={{ "--w": 1 / longest } as CSSProperties}
				>
					<span className="lane-name">ArkType (precompiled)</span>
					<span className="lane-val">1×</span>
					<span className="lane-track">
						<span className="lane-bar" />
					</span>
				</li>
				{bars.map(bar => (
					<li
						key={bar.name}
						className={bar.name === incumbent ? "lane is-incumbent" : "lane"}
						style={{ "--w": bar.median / longest } as CSSProperties}
					>
						<span className="lane-name">{bar.name}</span>
						<span className="lane-val">
							<b>{bar.text}</b> slower
						</span>
						<span className="lane-track">
							<span className="lane-bar" />
						</span>
						<span className="lane-sub">
							{bar.closest} to {bar.farthest} · slower in {bar.slower}/{bar.of}
						</span>
					</li>
				))}
			</ol>
			<p className="card-rest">
				median of {of} scenarios · times slower than ArkType · shorter is better
			</p>
		</figure>
	)
}
