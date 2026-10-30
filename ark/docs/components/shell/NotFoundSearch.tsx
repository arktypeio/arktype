"use client"

import { useEffect, useState } from "react"
import { SearchButton } from "./SearchTrigger.tsx"

/** a search button that starts from the last segment of the missing url */
export const NotFoundSearch = () => {
	const [query, setQuery] = useState<string>()

	useEffect(() => {
		const segment = location.pathname.split("/").filter(Boolean).at(-1) ?? ""
		setQuery(
			decodeURIComponent(segment)
				.replace(/\.\w+$/, "")
				.replace(/[_-]/g, " ")
		)
	}, [])

	return <SearchButton query={query} />
}
