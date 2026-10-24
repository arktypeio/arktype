/** the event SearchDialog listens for, so triggers don't share React state with it */
export const openSearchEvent = "ark:open-search"

/** opens search, optionally starting from `query` */
export const openSearch = (query?: string): void => {
	window.dispatchEvent(new CustomEvent(openSearchEvent, { detail: query }))
}

/**
 * Dispatched when the search dialog or the drawer opens. Popovers over the
 * page, like the twoslash quickinfo, should close on it.
 */
export const closePopupsEvent = "ark:close-popups"

export const closePopups = (): void => {
	window.dispatchEvent(new Event(closePopupsEvent))
}
