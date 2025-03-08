"use client"

import { OramaClient } from "@oramacloud/client"
import type { SharedProps } from "fumadocs-ui/components/dialog/search"
import SearchDialog from "fumadocs-ui/components/dialog/search-orama"

const client = new OramaClient({
	endpoint: "https://cloud.orama.run/v1/indexes/docs-e3a3uw",
	api_key: "x4AtqNpQ64LuacCI6tpombaK3bm4vdKW"
})

export const OramaSearch = (props: SharedProps) => (
	<SearchDialog {...props} client={client} />
)

export default OramaSearch
