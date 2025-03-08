"use client"

import { OramaClient } from "@oramacloud/client"
import type { SharedProps } from "fumadocs-ui/components/dialog/search"
import SearchDialog from "fumadocs-ui/components/dialog/search-orama"

const client = new OramaClient({
	endpoint: "https://cloud.orama.run/v1/indexes/arktype-io-ytro75",
	api_key: "0STK6mN1ITA4GbbgYkg2Du9bJzXfaBYU"
})

export const OramaSearch = (props: SharedProps) => (
	<SearchDialog {...props} client={client} />
)

export default OramaSearch
