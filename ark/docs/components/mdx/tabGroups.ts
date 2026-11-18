/**
 * Tab groups that share a groupId switch together, and a persisted group's
 * choice is restored before first paint: a blocking script in app/layout.tsx
 * copies each stored choice onto `<html>`, and CSS from {@link prepaintCss}
 * shows the matching panel of every group that has it, so hydration changes
 * nothing the reader can see. The names here must match that script.
 */

/** the attribute on `<html>` holding a persisted group's choice */
export const tabsAttribute = (groupId: string): string =>
	groupId === "syntax" ? "data-syntax" : `data-tab-${groupId}`

/** where a persisted group's choice is stored */
export const tabsStorageKey = (groupId: string): string =>
	groupId === "syntax" ? "ark-syntax" : `ark-tabs:${groupId}`

/** a label as it can appear in a selector and a space-separated list */
export const tabValue = (label: string): string =>
	label.toLowerCase().replace(/[^\da-z]+/g, "-")

/** shows `value`'s panel in every `groupId` group that has one */
export const prepaintCss = (groupId: string, value: string): string => {
	const group = `html[${tabsAttribute(groupId)}="${value}"] [data-group="${groupId}"][data-tabs~="${value}"]`
	const tab = `${group}:not([data-ready]) [role="tab"]`
	return [
		`${group}>.tab-panel{display:none}`,
		`${group}>.tab-panel[data-panel="${value}"]{display:block}`,
		`${tab}[aria-selected="true"]{color:var(--ink-3)}`,
		`${tab}[aria-selected="true"]::after{opacity:0}`,
		`${tab}[data-tab="${value}"]{color:var(--ink)}`,
		`${tab}[data-tab="${value}"]::after{opacity:1}`
	].join("")
}
