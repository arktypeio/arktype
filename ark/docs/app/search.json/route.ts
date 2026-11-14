import { getPageTree } from "../../lib/content/docs.ts"
import { buildSearchIndex } from "../../lib/content/search.ts"

export const dynamic = "force-static"

export const GET = (): Response =>
	Response.json(buildSearchIndex(getPageTree()))
