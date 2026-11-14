"use client"

import {
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode
} from "react"
import { CopyButton } from "./CopyButton.tsx"
import {
	prepaintCss,
	tabsAttribute,
	tabsStorageKey,
	tabValue
} from "./tabGroups.ts"

export type TabGroupProps = {
	labels: readonly string[]
	/** tabs with the same groupId switch together */
	groupId?: string | undefined
	/** remember the group's choice across pages and visits (needs groupId) */
	persist?: boolean | undefined
	/** every panel is one code block, so the tabs go in its header */
	code?: boolean | undefined
	/** names the tab list for screen readers */
	label?: string | undefined
	/** one panel per label, in order */
	panels: readonly ReactNode[]
}

const syncEvent = "ark:tabs"

type SyncDetail = { groupId: string; value: string }

/**
 * Tabs with a roving tabindex: arrow keys, Home and End move between them.
 * Every panel is rendered, so the content of hidden ones is still in the page.
 * Panels hide with `data-hidden` rather than `hidden`, which Tailwind's reset
 * makes `!important` and so beyond the reach of the prepaint CSS.
 */
export const TabGroup = ({
	labels,
	groupId,
	persist,
	code,
	label,
	panels
}: TabGroupProps) => {
	const id = useId()
	const values = labels.map(tabValue)
	const [selected, setSelected] = useState(values[0])
	const [ready, setReady] = useState(false)
	const root = useRef<HTMLDivElement>(null)
	const list = useRef<HTMLDivElement>(null)
	const anchorTop = useRef<number | undefined>(undefined)
	const valuesKey = values.join(" ")

	useLayoutEffect(() => {
		if (groupId && persist) {
			const stored = document.documentElement.getAttribute(
				tabsAttribute(groupId)
			)
			if (stored && valuesKey.split(" ").includes(stored)) setSelected(stored)
		}
		setReady(true)
	}, [groupId, persist, valuesKey])

	useEffect(() => {
		if (!groupId) return
		const onSync = (e: Event) => {
			const detail = (e as CustomEvent<SyncDetail>).detail
			if (
				detail.groupId === groupId &&
				valuesKey.split(" ").includes(detail.value)
			)
				setSelected(detail.value)
		}
		window.addEventListener(syncEvent, onSync)
		return () => window.removeEventListener(syncEvent, onSync)
	}, [groupId, valuesKey])

	useLayoutEffect(() => {
		const tablist = list.current
		if (!tablist) return
		const place = () => {
			const tab = tablist.querySelector<HTMLElement>('[aria-selected="true"]')
			if (!tab) return
			tablist.style.setProperty("--ink-x", `${tab.offsetLeft + 6}px`)
			tablist.style.setProperty("--ink-w", `${tab.offsetWidth - 12}px`)
		}
		place()
		const observer = new ResizeObserver(place)
		observer.observe(tablist)
		return () => observer.disconnect()
	}, [selected])

	// the clicked group stays put while groups above it change height
	useLayoutEffect(() => {
		if (anchorTop.current === undefined || !root.current) return
		window.scrollBy(
			0,
			root.current.getBoundingClientRect().top - anchorTop.current
		)
		anchorTop.current = undefined
	}, [selected])

	const select = (value: string, focus = false) => {
		if (focus)
			list.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`)?.focus()
		if (value === selected) return
		anchorTop.current = root.current?.getBoundingClientRect().top
		setSelected(value)
		if (!groupId) return
		if (persist) {
			document.documentElement.setAttribute(tabsAttribute(groupId), value)
			try {
				localStorage.setItem(tabsStorageKey(groupId), value)
			} catch {
				// storage can be unavailable, e.g. when cookies are blocked
			}
		}
		window.dispatchEvent(
			new CustomEvent<SyncDetail>(syncEvent, { detail: { groupId, value } })
		)
	}

	const tabList = (
		<div
			ref={list}
			role="tablist"
			aria-label={label}
			className="tabs-list"
			onKeyDown={e => {
				const i = values.indexOf(selected)
				const next =
					e.key === "ArrowRight" ? (i + 1) % values.length
					: e.key === "ArrowLeft" ? (i - 1 + values.length) % values.length
					: e.key === "Home" ? 0
					: e.key === "End" ? values.length - 1
					: undefined
				if (next === undefined) return
				e.preventDefault()
				select(values[next], true)
			}}
		>
			{labels.map((tabLabel, i) => (
				<button
					key={values[i]}
					type="button"
					role="tab"
					id={`${id}-tab-${i}`}
					data-tab={values[i]}
					aria-controls={`${id}-panel-${i}`}
					aria-selected={values[i] === selected}
					tabIndex={values[i] === selected ? 0 : -1}
					onClick={() => select(values[i])}
				>
					{tabLabel}
				</button>
			))}
			<span className="tabs-ink" aria-hidden />
		</div>
	)

	return (
		<div
			ref={root}
			className={code ? "cb" : "tabs"}
			data-group={groupId}
			data-tabs={valuesKey}
			data-ready={ready || undefined}
		>
			{groupId &&
				persist &&
				values.map(value => (
					<style
						key={value}
						href={`ark-tabs-${groupId}-${value}`}
						precedence="ark-tabs"
					>
						{prepaintCss(groupId, value)}
					</style>
				))}
			<div className={code ? "cb-head" : "tabs-bar"}>
				{tabList}
				{code && <CopyButton />}
			</div>
			{panels.map((panel, i) => (
				<div
					key={values[i]}
					role="tabpanel"
					id={`${id}-panel-${i}`}
					aria-labelledby={`${id}-tab-${i}`}
					className="tab-panel"
					data-panel={values[i]}
					data-hidden={values[i] !== selected || undefined}
				>
					{panel}
				</div>
			))}
		</div>
	)
}
