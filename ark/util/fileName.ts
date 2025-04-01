// based on the util of the same name in @ark/fs
// isolated here for use with registry
/** get a CJS/ESM compatible string representing the current file */
export const fileName = (): string => {
	try {
		const error = new Error()
		const stackLine = error.stack?.split("\n")[2]?.trim() || "" // [1]=this func, [2]=caller
		const filePath =
			stackLine.match(/\(?(.+?)(?::\d+:\d+)?\)?$/)?.[1] || "unknown"
		return filePath.replace(/^file:\/\//, "")
	} catch {
		return "unknown"
	}
}
