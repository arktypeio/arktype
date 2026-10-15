"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"

export type TableProps = ComponentProps<"table"> & {
	/** column widths as space-separated percentages, set by `alignTables` */
	"data-widths"?: string
}

/**
 * MDX's `table`, scrolling sideways in its own frame rather than widening
 * the page. While it overflows, the frame is a tab stop named for its
 * columns, so it scrolls from the keyboard like a code block.
 */
export const Table = ({
	"data-widths": widths,
	children,
	...props
}: TableProps) => {
	const frame = useRef<HTMLDivElement>(null)
	const [label, setLabel] = useState<string>()
	useEffect(() => {
		const element = frame.current!
		const observer = new ResizeObserver(() =>
			setLabel(
				element.scrollWidth > element.clientWidth ?
					[...element.querySelectorAll("thead th")]
						.map(th => th.textContent)
						.join(", ") || "table"
				:	undefined
			)
		)
		observer.observe(element)
		observer.observe(element.firstElementChild!)
		return () => observer.disconnect()
	}, [])
	return (
		<div
			ref={frame}
			className="table-scroll"
			{...(label !== undefined && {
				tabIndex: 0,
				role: "region",
				"aria-label": label
			})}
		>
			<table {...props}>
				{widths && (
					<colgroup>
						{widths.split(" ").map((width, i) => (
							<col key={i} style={{ width: `${width}%` }} />
						))}
					</colgroup>
				)}
				{children}
			</table>
		</div>
	)
}
