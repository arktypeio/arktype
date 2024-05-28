import React from "react"

const barStyles: React.CSSProperties = {
	height: "30px",
	borderRadius: "5px",
	display: "flex",
	alignItems: "baseline",
	marginRight: "1rem",
	color: "black"
}

const arkBarStyles = {
	...barStyles,
	background:
		"repeating-linear-gradient(135deg, #40decc, #40decc 10px, #34c8b9 10px, #34c8b9 20px)"
}

const zodBarStyles = {
	...barStyles,
	background:
		"repeating-linear-gradient(135deg, #b084f6, #b084f6 10px, #9a6fe3 10px, #9a6fe3 20px)"
}

export const RuntimeBenchmarksGraph = () => (
	<div style={{ fontSize: 14, fontWeight: 500 }}>
		<div
			style={{
				display: "flex",
				flexDirection: "row"
			}}
		>
			<h6 style={{ fontSize: 16 }}>
				Node v22.2.0 (
				<a
					target="_blank"
					href="https://moltar.github.io/typescript-runtime-type-benchmarks/"
				>
					source
				</a>
				)
			</h6>
		</div>
		<div style={{ ...arkBarStyles, width: "100%" }}>
			&nbsp;&nbsp;ArkType (68,581,169 ops)
		</div>
		<div
			style={{
				display: "flex",
				alignItems: "center"
			}}
		>
			<div style={{ ...zodBarStyles, width: "1.06%" }}></div>
			Zod (727,703 ops)
		</div>
	</div>
)

export const TypeBenchmarksGraph = () => (
	<div style={{ fontSize: 14, fontWeight: 500 }}>
		<div
			style={{
				display: "flex",
				flexDirection: "row"
			}}
		>
			<h6 style={{ fontSize: 15 }}>
				Union Type Instantiations, TypeScript 5.4.5 (
				<a
					target="_blank"
					href="https://moltar.github.io/typescript-runtime-type-benchmarks/"
				>
					source
				</a>
				)
			</h6>
		</div>
		<div
			style={{
				display: "flex",
				alignItems: "center"
			}}
		>
			<div style={{ ...arkBarStyles, width: "10.94%" }}></div>
			ArkType Auto-Discriminated (7,801)
		</div>
		<div
			style={{
				display: "flex",
				alignItems: "center"
			}}
		>
			<div style={{ ...zodBarStyles, width: "34.98%" }}></div>
			Zod Raw (24,944)
		</div>
		<div style={{ ...zodBarStyles, width: "100%", justifyContent: "end" }}>
			Zod Discriminated (71,312)&nbsp;&nbsp;
		</div>
	</div>
)
