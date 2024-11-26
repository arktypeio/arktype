import { cn } from "fumadocs-ui/components/api"
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

export const RuntimeBenchmarksGraph: React.FC<{ className?: string }> = ({
	className
}) => (
	<div
		style={{ fontSize: 14, fontWeight: 500 }}
		className={cn("font-semibold text-white", className)}
	>
		<div
			style={{
				display: "flex",
				flexDirection: "row"
			}}
		>
			<h6 className="text-lg mb-2">
				Object Validation, Node v22.2.0 (
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
			<div style={{ ...arkBarStyles, width: "1.06%" }}></div>
			ArkType (15 nanoseconds)
		</div>
		<div style={{ ...zodBarStyles, width: "100%" }}>
			&nbsp;&nbsp;Zod (1374 nanoseconds)
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
				Union Type Instantiations, TypeScript 5.5.3 (
				<a
					target="_blank"
					href="https://github.com/arktypeio/arktype/blob/468da965d9a2bbb16fe38d37e82c3b35e5158334/ark/repo/scratch/discriminatedComparison.ts"
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
