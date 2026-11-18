console.log("e.ts runs")

export function h(extra: object) {
	return { e: "string", ...extra } as const
}
