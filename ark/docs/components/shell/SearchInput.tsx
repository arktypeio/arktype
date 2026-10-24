import { SearchIcon } from "lucide-react"
import type { ComponentProps } from "react"

/** the search dialog's query field, shared by the panel and its loading state */
export const SearchInput = (props: ComponentProps<"input">) => (
	<div className="search-input">
		<SearchIcon aria-hidden />
		<input
			type="search"
			placeholder="Search the docs"
			aria-label="Search docs"
			autoComplete="off"
			spellCheck={false}
			{...props}
		/>
		<kbd>esc</kbd>
	</div>
)
