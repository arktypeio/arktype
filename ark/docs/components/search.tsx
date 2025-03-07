"use client"

import { OramaClient } from "@oramacloud/client"
import type { SharedProps } from "fumadocs-ui/components/dialog/search"
import SearchDialog from "fumadocs-ui/components/dialog/search-orama"

const client = new OramaClient({
	endpoint: "https://cloud.orama.run/v1/indexes/docs-e3a3uw",
	api_key: process.env.ORAMA_PRIVATE_API_KEY ?? ""
})

export const OramaSearch = (props: SharedProps) => (
	<SearchDialog {...props} client={client} showOrama />
)
