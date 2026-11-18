import type { ReactNode } from "react"

export type DrillProps = {
	/** what opening it shows, as a noun phrase */
	title: string
	/** the one thing it holds, beside the title */
	hint?: string
	/** an anchor other pages link to; HomeEffects opens the drill-down a hash lands in */
	id?: string
	children: ReactNode
}

/**
 * A section's data, method or trade-offs, closed until asked for. A native
 * `<details>`, so it opens without JS, and find-in-page reaches inside it.
 */
export const Drill = ({ title, hint, id, children }: DrillProps) => (
	<details className="drill" id={id}>
		<summary>
			<span className="drill-mark" aria-hidden />
			<span className="drill-title">{title}</span>
			{hint && <span className="drill-hint">{hint}</span>}
		</summary>
		<div className="drill-body">{children}</div>
	</details>
)

export type DrillsProps = {
	children: ReactNode
}

/** a section's drill-downs, one row each */
export const Drills = ({ children }: DrillsProps) => (
	<div className="drills">{children}</div>
)

export type PointStat = {
	/** the number, as its claim states it: "15×" */
	value: string
	/** what it is a number of, in a line */
	unit: ReactNode
}

export type PointProps = {
	id: string
	/** the section's number, as the page counts them: "02" */
	n: string
	/** what the section is about, in a word or two */
	kicker: string
	title: ReactNode
	deck?: ReactNode
	/** a tag beside the kicker */
	tag?: ReactNode
	/** the section's one big number, counted up to as it is seen */
	stat?: PointStat
	/** what proves the point: its animation */
	figure: ReactNode
	/** beside the copy on a wide screen, or under it */
	layout?: "split" | "stack"
	/** under the copy, like a command or a link */
	aside?: ReactNode
	/** the drill-downs */
	children?: ReactNode
}

/** the big number, split so HomeEffects can count up to it in its own precision */
const Stat = ({ value, unit }: PointStat) => {
	const [, digits, suffix] = /^([\d.]+)(.*)$/.exec(value)!
	return (
		<p className="stat">
			<span
				className="stat-num"
				data-to={digits}
				data-decimals={digits.split(".")[1]?.length ?? 0}
				data-suffix={suffix}
			>
				{value}
			</span>
			<span className="stat-unit">{unit}</span>
		</p>
	)
}

/** one point: a headline, at most a sentence, what proves it, then its drill-downs */
export const Point = ({
	id,
	n,
	kicker,
	title,
	deck,
	tag,
	stat,
	figure,
	layout = "stack",
	aside,
	children
}: PointProps) => (
	<section
		className={`block point is-${layout}`}
		id={id}
		aria-labelledby={`${id}-title`}
	>
		<div className="point-main">
			<div className="point-copy">
				<div className="sec-label">
					<b>{n}</b>
					{`// ${kicker}`} {tag}
				</div>
				{stat && <Stat {...stat} />}
				<h2 id={`${id}-title`}>{title}</h2>
				{deck && <p className="deck">{deck}</p>}
				{aside}
			</div>
			<div className="point-figure">{figure}</div>
		</div>
		{children}
	</section>
)
