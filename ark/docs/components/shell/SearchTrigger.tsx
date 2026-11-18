"use client"

import { SearchIcon } from "lucide-react"
import { preloadSearch } from "./SearchDialog.tsx"
import { openSearch } from "./searchEvents.ts"

const shortcuts = "Control+K Meta+K /"

/** the top bar's search field, which opens the search dialog */
export const SearchButton = ({ query }: { query?: string | undefined }) => (
	<button
		type="button"
		className="search-btn"
		aria-keyshortcuts={shortcuts}
		onPointerEnter={preloadSearch}
		onFocus={preloadSearch}
		onClick={() => openSearch(query)}
	>
		<SearchIcon aria-hidden />
		<span className="sb-text">Search docs</span>
		{/* CSS shows the one for the platform, which the head script marks */}
		<kbd className="sb-kbd" aria-hidden>
			<span className="kbd-mac">⌘K</span>
			<span className="kbd-other">Ctrl K</span>
		</kbd>
	</button>
)

/** search as an icon, for phones */
export const SearchIconButton = () => (
	<button
		type="button"
		className="tb-icon tb-search"
		aria-label="Search docs"
		aria-keyshortcuts={shortcuts}
		onPointerEnter={preloadSearch}
		onFocus={preloadSearch}
		onClick={() => openSearch()}
	>
		<SearchIcon aria-hidden />
	</button>
)
