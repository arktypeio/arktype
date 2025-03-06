import type { OramaDocument } from "fumadocs-core/search/orama-cloud"
import { NextResponse } from "next/server"
import { source } from "../../lib/source.tsx"

export const revalidate = false

export const GET = () => {
	const results: OramaDocument[] = []

	for (const page of source.getPages()) {
		results.push({
			id: page.url,
			structured: (page.data as any).structuredData,
			url: page.url,
			title: page.data.title,
			description: page.data.description
		} as never)
	}

	return NextResponse.json(results)
}
