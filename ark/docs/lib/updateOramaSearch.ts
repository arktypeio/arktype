import { CloudManager } from "@oramacloud/client"
import { sync } from "fumadocs-core/search/orama-cloud"
import * as fs from "node:fs/promises"

export const updateSearchIndexes = async () => {
	const apiKey = process.env.ORAMA_PRIVATE_API_KEY // private API key

	if (!apiKey) {
		console.log("no api key for Orama found, skipping")
		return
	}

	const content = await fs.readFile(".next/server/app/static.json.body")
	const records = JSON.parse(content.toString())

	const manager = new CloudManager({ api_key: apiKey })

	await sync(manager, {
		index: "docs",
		documents: records
	})

	console.log(`search updated: ${records.length} records`)
}

void updateSearchIndexes()
