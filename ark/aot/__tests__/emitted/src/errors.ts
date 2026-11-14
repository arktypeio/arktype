import { ArkErrors } from "arktype"

export const summaryOf = (out: unknown): string =>
	out instanceof ArkErrors ? out.summary : JSON.stringify(out)
