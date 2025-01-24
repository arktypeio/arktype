"use client"
import React, { useState } from "react"

interface WithTooltipProps {
	text: string
	info: string
	children?: React.ReactNode
}

export const WithTooltip: React.FC<WithTooltipProps> = ({
	text,
	info,
	children
}) => {
	const [hovered, setHovered] = useState(false)

	return (
		<span
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className="relative inline-block cursor-help"
		>
			{text}
			{hovered && (
				<div
					className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 rounded-md text-sm text-white"
					style={{
						background: "transparent",
						backdropFilter: "blur(16px)",
						boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
						width: "max-content",
						maxWidth: "240px"
					}}
				>
					{info}
				</div>
			)}
			{children}
		</span>
	)
}
