import type { OramaDocument } from "fumadocs-core/search/orama-cloud"
import { NextResponse } from "next/server"
import { source } from "../../lib/source"

export const revalidate = false

export const GET = async () => {
	const results: OramaDocument[] = []

	for (const page of source.getPages()) {
		results.push({
			id: page.url,
			structured: (await page.data.load()).structuredData,
			url: page.url,
			title: page.data.title,
			description: page.data.description ?? ""
		})
	}

	return NextResponse.json(results)
}
