import type { CSSProperties, ReactNode } from "react"
import {
	benchFacts,
	benchNotes,
	benchPanels,
	benchTable,
	harness,
	preview,
	type BenchPanel,
	type BenchSet
} from "../../lib/bench/bench.ts"
import { BenchmarkControls } from "../home/BenchmarkControls.tsx"
import { Table } from "./Table.tsx"

const pct = (n: number) => `${n.toFixed(2)}%`

type PanelProps = {
	panel: BenchPanel
	index: number
	/** the row that's its set's one tab stop, if it's in this panel (see BenchmarkControls) */
	entry: number
}

const Panel = ({ panel, index, entry }: PanelProps) => (
	<figure
		className={
			panel.rows.some(row => row.faster && !row.tie) ?
				"b-panel has-faster"
			:	"b-panel"
		}
		style={{ "--i": index } as CSSProperties}
		aria-label={panel.description}
	>
		<figcaption>
			<span className="b-title">{panel.title}</span>
			<span className={panel.pill.loss ? "b-pill is-loss" : "b-pill"}>
				{panel.pill.text}
			</span>
			<span className="b-blurb">{panel.blurb}</span>
		</figcaption>
		<ol className="b-rows" style={{ "--one": pct(panel.one) } as CSSProperties}>
			{panel.rows.map((row, r) => (
				<li
					key={[row.label, ...row.notes.map(note => note.text)].join(" ")}
					className={
						row.ours ? "b-row is-ours"
						: row.tie ?
							"b-row is-tie"
						: row.faster ?
							"b-row is-faster"
						:	"b-row"
					}
					style={{ "--r": r } as CSSProperties}
					tabIndex={
						row.tip ?
							r === entry ?
								0
							:	-1
						:	undefined
					}
					data-tip={row.tip || undefined}
				>
					<span className="b-label">
						<span className="bl-name">{row.label}</span>
						{row.notes.map((note, i) => (
							<span
								key={note.text}
								className={note.kept ? "bl-note is-kept" : "bl-note"}
							>
								{i ? `· ${note.text}` : note.text}
							</span>
						))}
					</span>
					<span className="b-track">
						{row.ours ?
							<span className="b-dot" style={{ left: pct(row.left) }} />
						:	<span
								className={
									row.faster ? "b-bar to-left"
									: row.clipped ?
										"b-bar is-clipped"
									:	"b-bar"
								}
								style={{ left: pct(row.left), width: pct(row.width) }}
							/>
						}
					</span>
					<span className="b-val">
						<span className="bv-ns">{row.ns}</span>
						{row.tie ?
							<span className="b-tie">≈ tie</span>
						:	<span className={row.faster ? "bv-x is-faster" : "bv-x"}>
								{row.ratio}
							</span>
						}
					</span>
				</li>
			))}
		</ol>
		<div className="b-axis" aria-hidden>
			<span />
			<span className="b-ticks">
				{panel.ticks.map(tick => (
					<span
						key={tick.label}
						className={
							tick.one ? "b-tick is-one"
							: tick.end ?
								"b-tick is-end"
							: tick.minor ?
								"b-tick is-minor"
							:	"b-tick"
						}
						style={{ left: pct(tick.left) }}
					>
						{tick.label}
					</span>
				))}
			</span>
			<span />
		</div>
	</figure>
)

const Head = ({ labels }: { labels: readonly string[] }) => (
	<thead>
		<tr>
			{labels.map(label => (
				<th key={label} scope="col">
					{label}
				</th>
			))}
		</tr>
	</thead>
)

const Cells = ({ cells }: { cells: readonly string[] }) =>
	cells.map((cell, i) => (
		<td key={i} className={i === 0 ? "t-ours" : undefined}>
			{cell}
		</td>
	))

const setLabels: Record<BenchSet, string> = {
	valid: "Valid data",
	invalid: "Reporting errors on invalid data"
}

const SetGrid = ({ set, hidden }: { set: BenchSet; hidden?: boolean }) => {
	const panels = benchPanels(set)
	const first = panels.findIndex(panel => panel.rows.some(row => row.tip))
	return (
		<div
			className="b-grid"
			data-set={set}
			role="group"
			aria-label={`${setLabels[set]}, ${panels.length} scenarios`}
			hidden={hidden}
		>
			{panels.map((panel, i) => (
				<Panel
					key={panel.id}
					panel={panel}
					index={i}
					entry={i === first ? panel.rows.findIndex(row => row.tip) : -1}
				/>
			))}
		</div>
	)
}

export type BenchmarkChartProps = {
	/** grow the bars when the chart scrolls into view (the homepage; docs never animate content) */
	animate?: boolean
	/** shown between the chart and its footnote */
	children?: ReactNode
}

/**
 * Precompiled ArkType's runtime against the fastest validators, one panel per
 * scenario. Each bar runs from ArkType's time (the gold 1× rule) to the
 * library's on a log axis: right is slower than ArkType, left is faster.
 */
export const BenchmarkChart = ({ animate, children }: BenchmarkChartProps) => {
	const facts = benchFacts()
	const table = benchTable()
	const [method, ...notes] = benchNotes()
	return (
		<div className="bench" data-bench>
			<div className="bench-head">
				<BenchmarkControls animate={animate} />
				<div className="b-key" aria-hidden>
					<span className="k-ours">
						<i />
						ArkType, precompiled
					</span>
					<span className="k-bar">
						<i />
						time per call relative to ArkType · log{"\u00a0"}scale
					</span>
					<span>
						<span className="b-tie">≈ tie</span>no significant difference
					</span>
					{preview && (
						<span className="pre-tag">preview data · precompile branch</span>
					)}
				</div>
			</div>
			<SetGrid set="valid" />
			<SetGrid set="invalid" hidden />
			<p className="b-tally">
				all {facts.validCount} valid-data scenarios:{" "}
				<b>{facts.validWins} faster</b>, <b>{facts.validTies} tied</b>,{" "}
				<b>{facts.validLosses} slower</b> than the fastest other library · every
				one is in the table below
			</p>
			{children}
			<footer className="b-foot">
				<p>
					{preview && <span className="draft">draft data</span>}
					{method}
				</p>
				{notes.map(note => (
					<p key={note}>{note}</p>
				))}
				<p>
					{harness.lead}
					<a className="link" href={harness.url}>
						{harness.link}
					</a>
					.
				</p>
				<details className="twin">
					<summary>all {facts.scenarioCount} scenarios, as a table</summary>
					<Table className="b-table">
						<Head labels={table.head} />
						<tbody>
							{table.rows.map(row => (
								<tr key={row.scenario} className={`t-${row.verdict}`}>
									<th scope="row">
										{row.scenario}
										{row.firstError && (
											<span className="t-note"> first-error build</span>
										)}
									</th>
									<Cells cells={row.cells} />
									<td>{row.fastestOther}</td>
									<td className="t-verdict">{row.versus}</td>
								</tr>
							))}
						</tbody>
					</Table>
				</details>
			</footer>
		</div>
	)
}
