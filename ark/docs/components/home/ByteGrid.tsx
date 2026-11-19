import type { CSSProperties } from "react"
import { unitText } from "../../lib/bench/units.ts"
import { sizeChart, type BenchmarkBar } from "../../lib/claims.ts"
import { incumbent } from "./boardFacts.ts"

/** gzipped bytes a block stands for */
const block = 250

const blocksOf = (bytes: number) => Math.max(1, Math.round(bytes / block))

/** "1.03", "25.1", "89.8": kilobytes as the claims write them */
const kbDigits = unitText.kilobytes

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

type RivalRowProps = {
	name: string
	bytes: number
	/** its place among the rows that arrive once ArkType's blocks have settled */
	i: number
}

const RivalRow = ({ name, bytes, i }: RivalRowProps) => (
	<li
		className={name === incumbent ? "byte-row is-incumbent" : "byte-row"}
		style={{ "--i": i } as CSSProperties}
	>
		<span className="byte-name">{name}</span>
		<span className="byte-size">{kbDigits(bytes)} kB</span>
		<span className="byte-grid" aria-hidden>
			{Array.from({ length: blocksOf(bytes) }, (_, i) => (
				<i key={i} className="byte" />
			))}
		</span>
	</li>
)

/**
 * Valibot's login form, gzipped, a block per 250 B, every library at one
 * scale: ArkType's row, then each other library's, smallest first. Every
 * byte count is one of sizeChart's bars. The markup is the final state. With
 * motion, the section opens on ArkType without precompile, in grey: its
 * blocks cover the rows below until landing.css lets them go and HomeEffects
 * counts the bytes down, and only then do the number turn gold and the other
 * rows arrive.
 */
export const ByteGrid = () => {
	const dynamic = barOf("dynamic")
	const precompiled = barOf("precompiled")
	const rivals = sizeChart.bars
		.filter(bar => bar.kind === "other" && bar.value !== null)
		.map(bar => ({ name: bar.name, bytes: bar.value! }))
		.sort((l, r) => l.bytes - r.bytes)
	const total = blocksOf(dynamic.bytes)
	const kept = blocksOf(precompiled.bytes)
	return (
		<figure
			className="bytes"
			data-stage="bytes"
			aria-label={`Gzipped bundle of Valibot's login form: ArkType precompiled ${kbDigits(precompiled.bytes)} kB, ${rivals
				.map(rival => `${rival.name} ${kbDigits(rival.bytes)} kB`)
				.join(
					", "
				)}. Without precompile, ArkType is ${kbDigits(dynamic.bytes)} kB.`}
		>
			<ol className="byte-rows">
				<li className="byte-row is-ours">
					<span className="byte-head">
						<span className="byte-name">ArkType</span>
						<span className="byte-size">
							<span
								className="bytes-num"
								data-from={kbDigits(dynamic.bytes)}
								data-to={kbDigits(precompiled.bytes)}
							>
								{kbDigits(precompiled.bytes)}
							</span>{" "}
							kB
						</span>
						<span className="byte-state">
							<span className="byte-before" aria-hidden>
								without precompile
							</span>
							<span className="byte-after">
								precompiled · {kbDigits(dynamic.bytes)} kB without
							</span>
						</span>
					</span>
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
				</li>
				{rivals.map((rival, i) => (
					<RivalRow key={rival.name} {...rival} i={i} />
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
