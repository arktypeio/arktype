import { cx } from "class-variance-authority"
import React from "react"

const barStyles: React.CSSProperties = {
	height: "30px",
	borderRadius: "8px",
	display: "flex",
	alignItems: "baseline",
	marginRight: "0.5rem",
	marginBottom: "0.5rem",
	color: "black"
}

const arkBarStyles = {
	...barStyles,
	background:
		"repeating-linear-gradient(135deg, #00ffd5, #00ffd5 12px, #00e6bf 12px, #00e6bf 24px)"
}
const zodBarStyles = {
	...barStyles,
	background:
		"repeating-linear-gradient(135deg, rgba(140, 205, 255, 0.6), rgba(140, 205, 255, 0.6) 12px, rgba(124, 189, 237, 0.6) 12px, rgba(124, 189, 237, 0.6) 24px)"
}

const yupBarStyles = {
	...barStyles,
	background:
		"repeating-linear-gradient(135deg, rgba(144, 175, 224, 0.7), rgba(144, 175, 224, 0.7) 12px, rgba(133, 157, 199, 0.7) 12px, rgba(133, 157, 199, 0.7) 24px)"
}

export const RuntimeBenchmarksGraph: React.FC<{ className?: string }> = ({
	className
}) => (
	<div
		style={{
			fontSize: 16.8,
			fontWeight: 500,
			display: "flex",
			flexDirection: "column",
			flexGrow: 1
		}}
		className={cx("font-semibold text-white", className)}
	>
		<div style={{ display: "flex", flexDirection: "row" }}>
			<h6 className="text-xl mb-2">Object Validation, Node v23.6.1</h6>{" "}
			<a
				className="underline ml-2"
				target="_blank"
				href="https://moltar.github.io/typescript-runtime-type-benchmarks/"
				style={{ textDecoration: "underline", color: "#1e90ff" }}
			>
				(source)
			</a>
		</div>
		<div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ ...arkBarStyles, width: "2%" }}></div>
				ArkType ⚡ 14 nanoseconds
			</div>
			<div style={{ ...zodBarStyles, width: "40%" }}>
				&nbsp;&nbsp;&nbsp;Zod 👍 281 nanoseconds
			</div>
			<div style={{ ...yupBarStyles, width: "100%" }}>
				&nbsp;&nbsp;&nbsp;Yup 🐌 40755 nanoseconds*
			</div>
			<div className="text-xs mt-auto self-end">
				*scaling generously logarithmized
			</div>
		</div>
	</div>
)
