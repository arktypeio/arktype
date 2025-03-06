"use client"

import { OramaClient } from "@oramacloud/client"
import type { SharedProps } from "fumadocs-ui/components/dialog/search"
import SearchDialog from "fumadocs-ui/components/dialog/search-orama"

const client = new OramaClient({
	endpoint: "endpoint",
	api_key: "apiKey"
})

export default function CustomSearchDialog(props: SharedProps) {
	return <SearchDialog {...props} client={client} showOrama />
}
