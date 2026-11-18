"use client"

import { openSearch } from "../shell/searchEvents.ts"
import { SearchIcon } from "./icons.tsx"

export const SearchPill = () => (
	<button
		type="button"
		className="search-pill"
		aria-label="Search docs"
		aria-keyshortcuts="Control+K Meta+K /"
		onClick={() => openSearch()}
	>
		<SearchIcon />
		<span className="label">Search docs</span>
		<span className="kbds" aria-hidden>
			<kbd className="kbd-mac">⌘</kbd>
			<kbd className="kbd-other">Ctrl</kbd>
			<kbd>K</kbd>
		</span>
	</button>
)
