import type { CSSProperties } from "react"
import { sizeChart, type BenchmarkBar } from "../../lib/claims.ts"

/** gzipped bytes a block stands for */
const block = 250

const blocksOf = (bytes: number) => Math.max(1, Math.round(bytes / block))

/** "1.01", "25.1", "89.8": kilobytes to three figures, as the claims write them */
const kbDigits = (bytes: number) => (bytes / 1000).toPrecision(3)

const barOf = (kind: BenchmarkBar["kind"]) => {
	const bar = sizeChart.bars.find(bar => bar.kind === kind)
	if (!bar || bar.value === null)
		throw new Error(`sizeChart has no ${kind} bar`)
	return { name: bar.name, bytes: bar.value }
}

/**
 * Where a block falls in the order the parser's blocks leave: from the far
 * end back toward what's kept, each a little out of step so the edge frays
 */
const leaveAt = (i: number, total: number) => {
	const jitter = ((i * 2654435761) % 1000) / 1000
	return (((total - i) / total) * 0.82 + jitter * 0.18).toFixed(3)
}

type RivalGridProps = {
	name: string
	bytes: number
}

const RivalGrid = ({ name, bytes }: RivalGridProps) => (
	<li className="bytes-rival">
		<span className="bytes-name">{name}</span>
		<span className="bytes-size">{kbDigits(bytes)} kB</span>
		<span className="byte-grid" aria-hidden>
			{Array.from({ length: blocksOf(bytes) }, (_, i) => (
				<i key={i} className="byte" />
			))}
		</span>
	</li>
)

/**
 * Valibot's login form, gzipped, a block per 250 B: ArkType's dynamic bundle,
 * then what's left of it precompiled, beside the same form in each other
 * library. Every byte count is one of sizeChart's bars. The markup is the
 * final state: home.css fills the parser's blocks back in before the section
 * is seen and lets them go as it plays, while HomeEffects counts the bytes
 * down.
 */
export const ByteGrid = () => {
	const dynamic = barOf("dynamic")
	const precompiled = barOf("precompiled")
	const rivals = sizeChart.bars
		.filter(bar => bar.kind === "other" && bar.value !== null)
		.map(bar => ({ name: bar.name, bytes: bar.value! }))
		.sort((l, r) => r.bytes - l.bytes)
	const total = blocksOf(dynamic.bytes)
	const kept = blocksOf(precompiled.bytes)
	return (
		<figure
			className="bytes"
			data-stage="bytes"
			aria-label={`Gzipped bundle of Valibot's login form: ArkType dynamic ${kbDigits(dynamic.bytes)} kB, ArkType precompiled ${kbDigits(precompiled.bytes)} kB, ${rivals
				.map(rival => `${rival.name} ${kbDigits(rival.bytes)} kB`)
				.join(", ")}`}
		>
			<div className="bytes-ours">
				<div className="bytes-read">
					<span className="bytes-name">ArkType</span>
					<span className="bytes-now">
						<span
							className="bytes-num"
							data-from={kbDigits(dynamic.bytes)}
							data-to={kbDigits(precompiled.bytes)}
						>
							{kbDigits(precompiled.bytes)}
						</span>{" "}
						kB
					</span>
					<span className="bytes-was">
						<span className="bytes-step is-dynamic">
							dynamic · {kbDigits(dynamic.bytes)} kB
						</span>
						<span className="bytes-arrow" aria-hidden>
							→
						</span>
						<span className="bytes-step is-precompiled">precompiled</span>
					</span>
				</div>
				<span className="byte-grid is-ours" aria-hidden>
					{Array.from({ length: total }, (_, i) =>
						i < kept ?
							<i key={i} className="byte is-kept" />
						:	<i
								key={i}
								className="byte is-parser"
								style={{ "--k": leaveAt(i, total) } as CSSProperties}
							/>
					)}
				</span>
				<span className="bytes-key" aria-hidden>
					<span className="key-kept">what ships</span>
					<span className="key-parser">
						arktype's parser and compiler, left at build
					</span>
				</span>
			</div>
			<ol className="bytes-rivals">
				{rivals.map(rival => (
					<RivalGrid key={rival.name} {...rival} />
				))}
			</ol>
			<figcaption>
				one block ≈ {block} B gzipped ·{" "}
				<a href={sizeChart.source.href} target="_blank" rel="noreferrer">
					{sizeChart.source.label}
				</a>
			</figcaption>
		</figure>
	)
}
