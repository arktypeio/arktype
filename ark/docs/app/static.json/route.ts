import type { OramaDocument } from "fumadocs-core/search/orama-cloud"
import { NextResponse } from "next/server"
import { source } from "../../lib/source.tsx"

export const revalidate = false

export const GET = () => {
	const results: OramaDocument[] = []

	for (const page of source.getPages()) {
		if ("structuredData" in page.data) {
			results.push({
				id: page.url,
				structured: page.data.structuredData as never,
				url: page.url,
				title: page.data.title,
				description: page.data.description ?? ""
			})
		}
	}

	return NextResponse.json(results)
}
