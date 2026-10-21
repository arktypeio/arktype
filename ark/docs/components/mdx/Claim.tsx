import type { CSSProperties } from "react"
import {
	claims,
	draftOf,
	isPending,
	sizeChart,
	speedChart,
	type BenchmarkChart,
	type ClaimId,
	type Claim as ClaimValue
} from "../../lib/claims.ts"

export const ClaimText = ({ claim }: { claim: ClaimValue<string> }) =>
	isPending(claim) ?
		<span
			className="pending-claim"
			title="Pending: not yet backed by a verified benchmark"
		>
			{draftOf(claim)}
		</span>
	:	<>{claim}</>

/** a sentence from lib/claims.ts, marked while it's pending */
export const Claim = ({ id }: { id: ClaimId }) => (
	<p>
		<ClaimText claim={claims[id]} />
	</p>
)

const ClaimChart = ({ chart }: { chart: BenchmarkChart }) => {
	const max =
		chart.axisMax ?? Math.max(...chart.bars.map(bar => bar.value ?? 0))
	return (
		<figure className="claim-chart">
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
				{chart.bars.map(bar => (
					<li key={bar.name} className={`cc-row is-${bar.kind}`}>
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
			and the options it was built with.
		</p>
	</>
)
