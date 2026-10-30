import type { ReactNode } from "react"

export type CalloutType = "info" | "warn" | "error" | "tip"

export type CalloutProps = {
	/** @default "info" */
	type?: CalloutType
	/** plain text */
	title?: string
	children: ReactNode
}

const labels = {
	info: "info",
	warn: "warning",
	error: "error",
	tip: "tip"
} satisfies Record<CalloutType, string>

/**
 * A note rather than an `<aside>`, which would add a nameless landmark.
 * Its type is in text, so it doesn't rely on color.
 */
export const Callout = ({ type = "info", title, children }: CalloutProps) => (
	<div className="callout" role="note" data-type={type}>
		<span className="co-mark" aria-hidden />
		<div className="co-body">
			<p className="co-title">
				<span className="co-type">{labels[type] ?? labels.info}</span>
				{title}
			</p>
			{children}
		</div>
	</div>
)
