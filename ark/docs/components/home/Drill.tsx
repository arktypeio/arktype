import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode
} from "react"

export type DrillProps = {
	/** what opening it shows, in two or three plain words: "where we lose" */
	chip: string
	/** what the panel concludes, in a line, before any of its data */
	verdict: ReactNode
	/** an anchor other pages link to; HomeEffects opens the panel a hash lands in */
	id?: string
	children: ReactNode
	/** the panel's id, which `Drills` sets */
	panel?: string
}

/**
 * A section's data, method or trade-offs, behind a chip until asked for. The
 * panel opens with its verdict, so a reader who stops there has the answer.
 */
export const Drill = ({ verdict, panel, children }: DrillProps) => (
	<div className="drill-panel" id={panel} data-closed="">
		<p className="drill-verdict">{verdict}</p>
		{children}
	</div>
)

export type DrillsProps = {
	/** the section's id, which its panels' ids are built from */
	name: string
	/** after the chips, in their row: a link to what another section shows */
	links?: ReactNode
	children: ReactNode
}

const isDrill = (child: unknown): child is ReactElement<DrillProps> =>
	isValidElement<DrillProps>(child) && typeof child.props.chip === "string"

/**
 * A section's drill-downs: one row of chips under its figure, each opening
 * its panel below the row. HomeEffects toggles them; without scripts the
 * page's <noscript> rule shows every panel.
 */
export const Drills = ({ name, links, children }: DrillsProps) => {
	const drills = Children.toArray(children).filter(isDrill)
	const panelOf = (drill: ReactElement<DrillProps>, i: number) =>
		drill.props.id ?? `${name}-more-${i + 1}`
	return (
		<div className="drills" data-drills>
			<div className="drill-chips" role="group" aria-label="The data behind it">
				{drills.map((drill, i) => (
					<button
						key={drill.props.chip}
						type="button"
						className="drill-chip"
						aria-expanded="false"
						aria-controls={panelOf(drill, i)}
					>
						{drill.props.chip}
					</button>
				))}
				{links}
			</div>
			{drills.map((drill, i) =>
				cloneElement(drill, {
					key: drill.props.chip,
					panel: panelOf(drill, i)
				})
			)}
		</div>
	)
}

export type StatProps = {
	/** the number, as its claim states it: "15×" */
	value: string
	/** what it is a number of, in a line */
	unit: ReactNode
	/** the section that measures it, if the stat isn't in it */
	href?: string
}

/**
 * A big number, split so HomeEffects can count up to it in its own
 * precision once the number itself is on screen
 */
export const Stat = ({ value, unit, href }: StatProps) => {
	const [, digits, suffix] = /^([\d.]+)(.*)$/.exec(value)!
	const body = (
		<>
			<span
				className="stat-num"
				data-to={digits}
				data-decimals={digits.split(".")[1]?.length ?? 0}
				data-suffix={suffix}
			>
				{value}
			</span>
			<span className="stat-unit">{unit}</span>
		</>
	)
	return href ?
			<a className="stat" href={href}>
				{body}
			</a>
		:	<p className="stat">{body}</p>
}

export type PointLayout = "split" | "flip"

export type PointProps = {
	id: string
	/** the section's number, as the page counts them: "02" */
	n: string
	/** what the section is about, in a word or two */
	kicker: string
	title: ReactNode
	deck?: ReactNode
	/** the section's one big number, counted up to as it is seen */
	stat?: StatProps
	/** what proves the point: its animation */
	figure: ReactNode
	/** `split`: copy beside the figure. `flip`: the figure first. */
	layout?: PointLayout
	/** under the copy, like a command or a link */
	aside?: ReactNode
	/** under the figure, always shown: what the point doesn't cover */
	caveat?: ReactNode
	/** the drill-downs */
	children?: ReactNode
}

/** one point: a headline, at most a sentence, what proves it, then its drill-downs */
export const Point = ({
	id,
	n,
	kicker,
	title,
	deck,
	stat,
	figure,
	layout = "split",
	aside,
	caveat,
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
					{`// ${kicker}`}
				</div>
				{stat && <Stat {...stat} />}
				<div className="point-words">
					<h2 id={`${id}-title`}>{title}</h2>
					{deck && <p className="deck">{deck}</p>}
					{aside}
				</div>
			</div>
			<div className="point-figure">{figure}</div>
		</div>
		{caveat && <div className="point-caveat">{caveat}</div>}
		{children}
	</section>
)
