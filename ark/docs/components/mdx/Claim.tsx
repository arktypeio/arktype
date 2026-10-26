import type { CSSProperties } from "react"
import {
	claims,
	draftOf,
	headlineMethod,
	isPending,
	sizeChart,
	speedChart,
	type BenchmarkChart,
	type ClaimId,
	type Claim as ClaimValue
} from "../../lib/claims.ts"
import { GrowOnView } from "./GrowOnView.tsx"

export const ClaimText = ({ claim }: { claim: ClaimValue<string> }) =>
	isPending(claim) ?
		<span
			className="pending-claim"
			title="Pending: not yet backed by a verified benchmark"
		>
			{draftOf(claim)}
		</span>
	:	<>{claim}</>

/** a claim from lib/claims.ts, inline in a paragraph, marked while it's pending, or with `ifBacked` left out until it isn't */
export const Claim = ({ id, ifBacked }: { id: ClaimId; ifBacked?: boolean }) =>
	ifBacked && isPending(claims[id]) ? null : <ClaimText claim={claims[id]} />

/** the headline, as claims.ts states and guards it */
export const Headline = () => <ClaimText claim={claims.headline} />

/** what the headline's superlatives average, linking the rule */
export const HeadlineNote = () => (
	<div id="headline-note">
		<p>
			<ClaimText claim={claims.headlineNote} />{" "}
			<a href={headlineMethod.href} target="_blank" rel="noreferrer">
				{headlineMethod.label} ↗
			</a>
		</p>
	</div>
)

const ClaimChart = ({ chart }: { chart: BenchmarkChart }) => {
	const max =
		chart.axisMax ?? Math.max(...chart.bars.map(bar => bar.value ?? 0))
	return (
		<figure className="claim-chart" data-grow="">
			<figcaption>
				<span className="cc-title">{chart.title}</span>
				<span className="cc-unit">{chart.unit}, lower is better</span>
				<span className="cc-detail">
					<ClaimText claim={chart.detail} /> (
					<a href={chart.source.href} target="_blank" rel="noreferrer">
						{chart.source.label}
					</a>
					)
				</span>
			</figcaption>
			<ol>
				{chart.bars.map((bar, i) => (
					<li
						key={bar.name}
						className={`cc-row is-${bar.kind}`}
						style={
							{
								"--r": i,
								// at one speed, as the homepage's bars race: the shortest lands first
								"--d": `${((Math.min(bar.value ?? 0, max) / max) * 0.9).toFixed(3)}s`
							} as CSSProperties
						}
					>
						<span className="cc-name">{bar.name}</span>
						{bar.value === null ?
							<span className="cc-bar is-pending">pending</span>
						:	<span className="cc-track">
								<span
									className={bar.value > max ? "cc-bar is-clipped" : "cc-bar"}
									style={
										{
											"--w": `${Math.max((Math.min(bar.value, max) / max) * 100, 1.5)}%`
										} as CSSProperties
									}
								/>
								<span className="cc-val">
									{bar.value.toLocaleString("en-US")}
								</span>
							</span>
						}
					</li>
				))}
			</ol>
		</figure>
	)
}

/** the speed and size charts, with the sentence that sums them up */
export const ClaimCharts = () => (
	<>
		<div className="claim-charts">
			<ClaimChart chart={speedChart} />
			<ClaimChart chart={sizeChart} />
		</div>
		<p>
			<ClaimText claim={claims.chartsSummary} /> Each chart names its benchmark
			and the options ArkType was built with.
		</p>
		<GrowOnView />
	</>
)
