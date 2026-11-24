import { format, resolveConfig } from "prettier"
import { fileURLToPath } from "node:url"

/** Formats generated text the way `pnpm checkPrettier` expects it at `url`. */
export const formatFor = async (url: URL, text: string): Promise<string> => {
	const filepath = fileURLToPath(url)
	return format(text, { ...(await resolveConfig(filepath)), filepath })
}
