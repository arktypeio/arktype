import {
	createSearchAPI,
	type AdvancedIndex
} from "fumadocs-core/search/server"
import { source } from "../../../lib/source.tsx"

// it should be cached forever
export const revalidate = false
export const { staticGET: GET } = createSearchAPI("advanced", {
	indexes: await Promise.all(
		source.getPages().map(
			async page =>
				({
					id: page.url,
					title: page.data.title,
					description: page.data.description,
					url: page.url,
					structuredData: (await page.data.load()).structuredData
				}) as AdvancedIndex
		)
	)
})
