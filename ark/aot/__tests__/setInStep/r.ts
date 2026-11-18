export const r = (f: () => { expression: string }) => {
	try {
		return f().expression
	} catch (e) {
		return `threw ${(e as Error).name}`
	}
}
