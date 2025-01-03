import { createFromSource } from "fumadocs-core/search/server"
import { source } from "../../../lib/source.tsx"

// it should be cached forever
export const revalidate = false
export const { staticGET: GET } = createFromSource(source)
