"use client"

import { FileTextIcon } from "lucide-react"
import MiniSearch, { type SearchResult } from "minisearch"
import { useRouter } from "next/navigation"
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type ReactNode
} from "react"
import type { SearchIndex } from "../../lib/content/search.ts"
import { SearchInput } from "./SearchInput.tsx"

/** how a page is named: what a query for it would say */
type PageNames = {
	/** its title's terms, or for a section's overview, the section's */
	terms: string[]
	/** its title and slug as single terms, e.g. "tojsonschema" */
	keys: string[]
}

type Loaded = { index: SearchIndex; search: MiniSearch; names: PageNames[] }

/** pages that mention most features in passing, so they rank below the pages about them */
const demoted = new Set(["/docs/upgrading"])

/** sections that aren't search scopes of their own, and rank like demoted pages */
const unscoped = new Set(["Blog"])

/** lowercases and folds plurals, so "scopes" finds Scopes and "benches" Benches */
const fold = (term: string) => {
	const lower = term.toLowerCase()
	return (
		lower.length > 4 && /(?:ch|sh|ss|x)es$/.test(lower) ? lower.slice(0, -2)
		: lower.length > 3 && /[^su]s$/.test(lower) ? lower.slice(0, -1)
		: lower
	)
}

/** a text's terms, split as MiniSearch's tokenizer splits them */
const termsOf = (text: string) =>
	text
		.split(/[\n\r\p{Z}\p{P}]+/u)
		.filter(Boolean)
		.map(fold)

const compact = (text: string) => text.replaceAll(/[\s-]/g, "")

let loading: Promise<Loaded> | undefined

export const load = (): Promise<Loaded> =>
	(loading ??= fetch("/search.json")
		.then(res => res.json() as Promise<SearchIndex>)
		.then(index => {
			const names = index.pages.map(page => ({
				terms: termsOf(
					index.pages.some(other => other.url.startsWith(`${page.url}/`)) ?
						index.sections[page.section]
					:	page.title
				),
				keys: termsOf(
					`${compact(page.title)} ${compact(page.url.split("/").at(-1)!)}`
				)
			}))
			// every page gets an entry of its own, even one that opens on a heading
			const covered = new Set(
				index.entries.filter(entry => !entry.id).map(entry => entry.page)
			)
			for (const page of index.pages.keys()) {
				if (!covered.has(page))
					index.entries.push({ page, heading: "", id: "", text: "" })
			}
			const search = new MiniSearch({
				fields: ["heading", "text", "title", "section", "key", "description"],
				storeFields: ["page", "top", "name"],
				processTerm: fold,
				searchOptions: {
					prefix: true,
					fuzzy: 0.15,
					combineWith: "AND",
					boost: {
						heading: 3,
						key: 3,
						description: 1.5,
						title: 1.5
					}
				}
			})
			search.addAll(
				index.entries.map((entry, id) => {
					const page = index.pages[entry.page]
					const top = !entry.id
					return {
						id,
						page: entry.page,
						top,
						name: termsOf(entry.heading.split(" · ").at(-1)!).join(" "),
						heading: entry.heading,
						text: entry.text,
						title: page.title,
						section: index.sections[page.section],
						key: top ? names[entry.page].keys.join(" ") : "",
						description: top ? page.description : ""
					}
				})
			)
			return { index, search, names }
		}))

/**
 * Ranks what a query names above what mentions it: a page's own entry gains
 * for each term of its name the query matches, and more when the query names
 * it whole; a heading gains when the query is its name. Pages in the reader's
 * section win near ties with namesakes in other sections, like ArkRegex's
 * Errors, and ArkType's win them elsewhere.
 */
const boostOf = ({ index, names }: Loaded, query: string, home: number) => {
	const queryTerms = termsOf(query)
	const queryName = queryTerms.join(" ")
	return (_id: unknown, term: string, stored?: Record<string, unknown>) => {
		const { page, top, name } = stored as {
			page: number
			top: boolean
			name: string
		}
		const { url, section } = index.pages[page]
		const demote = demoted.has(url) || unscoped.has(index.sections[section])
		const boost =
			demote ? 0.3
			: section === home ? 1.25
			: section === 0 ? 1.15
			: 1
		if (!top) return name === queryName && !demote ? boost * 4 : boost
		const { terms, keys } = names[page]
		const named =
			terms.every(t => queryTerms.includes(t)) ||
			keys.some(key => queryTerms.includes(key))
		return (
			boost *
			(terms.includes(term) || keys.includes(term) ? 3 : 1) *
			(named ? 2 : 1)
		)
	}
}

/** the section of the page being read, or ArkType's outside the docs */
const homeSectionOf = ({ index }: Loaded) => {
	const path = location.pathname.replace(/\/$/, "")
	return index.pages.find(page => page.url === path)?.section ?? 0
}

type Hit = {
	key: string
	href: string
	/** whether the hit is a whole page rather than a heading on one */
	page: boolean
	title: ReactNode
	snippet: ReactNode
}

type Group = { label: string; hits: Hit[] }

type Results = { groups: Group[]; count: number }

const maxGroups = 8
const hitsPerGroup = 3

export type SearchPanelProps = {
	initialQuery: string
	/** whether Enter was pressed while the panel loaded */
	entered?: boolean
	/** how far ↑ and ↓ pressed while the panel loaded moved the selection */
	moved?: number
	close: () => void
}

export const SearchPanel = ({
	initialQuery,
	entered,
	moved,
	close
}: SearchPanelProps) => {
	const [loaded, setLoaded] = useState<Loaded>()
	const [failed, setFailed] = useState(false)
	const [query, setQuery] = useState(initialQuery)
	// an Enter pressed before there were results opens the first one to arrive
	const [pending, setPending] = useState(entered ?? false)
	const [scope, setScope] = useState<number>()
	// arrows pressed before results arrive move from the first one when they do
	const [selected, setSelected] = useState(moved ?? 0)
	const input = useRef<HTMLInputElement>(null)
	const router = useRouter()

	useEffect(() => {
		load().then(setLoaded, () => {
			loading = undefined
			setFailed(true)
		})
	}, [])

	// before a paint or a keystroke, so the query typed while this loaded continues here
	useLayoutEffect(() => {
		const element = input.current
		if (!element) return
		element.focus()
		element.setSelectionRange(element.value.length, element.value.length)
	}, [])

	const { groups, count } = useMemo(
		() => (loaded ? resultsOf(loaded, query, scope) : { groups: [], count: 0 }),
		[loaded, query, scope]
	)
	const hits = groups.flatMap(group => group.hits)
	const active = hits[mod(selected, hits.length)]

	useEffect(() => {
		if (active)
			document.getElementById(active.key)?.scrollIntoView({ block: "nearest" })
	}, [active])

	const go = (href: string) => {
		close()
		router.push(href)
	}

	useEffect(() => {
		if (!pending || !loaded) return
		setPending(false)
		if (active) go(active.href)
	})

	const scopes =
		loaded ?
			[
				{ title: "All", index: undefined },
				...loaded.index.sections.flatMap((title, index) =>
					unscoped.has(title) ? [] : [{ title, index }]
				)
			]
		:	[]

	const chooseScope = (next: number | undefined) => {
		setScope(next)
		setSelected(0)
	}

	const onScopeKeyDown = (e: KeyboardEvent) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
		e.preventDefault()
		const step = e.key === "ArrowRight" ? 1 : -1
		const i = mod(
			scopes.findIndex(s => s.index === scope) + step,
			scopes.length
		)
		chooseScope(scopes[i].index)
		const radios = e.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")
		radios[i]?.focus()
	}

	return (
		<div
			className="search-panel"
			onKeyDown={e => {
				if (e.key === "ArrowDown" || e.key === "ArrowUp") {
					if (loaded && !hits.length) return
					e.preventDefault()
					const step = e.key === "ArrowDown" ? 1 : -1
					setSelected(i => mod(i, hits.length) + step)
				} else if (e.key === "Enter" && e.target === input.current) {
					e.preventDefault()
					if (active) go(active.href)
					else if (!loaded) setPending(true)
				}
			}}
		>
			<SearchInput
				ref={input}
				role="combobox"
				aria-expanded={hits.length > 0}
				aria-controls="search-results"
				aria-autocomplete="list"
				aria-activedescendant={active?.key}
				value={query}
				onChange={e => {
					setQuery(e.target.value)
					setSelected(0)
					setPending(false)
				}}
			/>
			<div
				className="search-scope"
				role="radiogroup"
				aria-label="Section"
				onKeyDown={onScopeKeyDown}
			>
				{scopes.map(s => (
					<button
						key={s.title}
						type="button"
						role="radio"
						aria-checked={s.index === scope}
						tabIndex={s.index === scope ? 0 : -1}
						onClick={() => chooseScope(s.index)}
					>
						{s.title}
					</button>
				))}
			</div>
			{failed ?
				<p className="sr-empty">Couldn't load the search index.</p>
			: !loaded ?
				<p className="sr-empty">Loading…</p>
			: !hits.length ?
				<p className="sr-empty">
					No results for “{query.trim()}”. Try a keyword like{" "}
					<code>string.email</code>.
				</p>
			:	<ul
					id="search-results"
					role="listbox"
					aria-label="Results"
					className="search-results"
				>
					{groups.map(group => (
						<li key={group.label} role="presentation">
							<p className="sr-group" aria-hidden>
								{group.label}
							</p>
							<ul role="group" aria-label={group.label}>
								{group.hits.map(hit => (
									<li
										key={hit.key}
										id={hit.key}
										role="option"
										aria-selected={hit === active}
										className="sr-item"
										onPointerMove={() => setSelected(hits.indexOf(hit))}
									>
										<a
											href={hit.href}
											tabIndex={-1}
											onClick={e => {
												if (e.metaKey || e.ctrlKey || e.shiftKey) return
												e.preventDefault()
												go(hit.href)
											}}
										>
											<span className="sr-kind" aria-hidden>
												{hit.page ?
													<FileTextIcon />
												:	"#"}
											</span>
											<span className="sr-title">{hit.title}</span>
											<span className="sr-text">{hit.snippet}</span>
										</a>
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			}
			<div className="search-foot">
				<span className="sf-keys">
					<kbd>↑</kbd>
					<kbd>↓</kbd> move
				</span>
				<span className="sf-keys">
					<kbd>↵</kbd> open
				</span>
				<span className="sf-keys">
					<kbd>esc</kbd> close
				</span>
				<span className="sf-right">
					{loaded && (
						<>
							<b>
								{count} {count === 1 ? "result" : "results"}
							</b>
							{" · "}
						</>
					)}
					also in{" "}
					<a className="link" href="/llms.txt">
						llms.txt
					</a>
				</span>
			</div>
		</div>
	)
}

/** `n` wrapped into `0..length`, or `n` itself when there's nothing to wrap */
const mod = (n: number, length: number) =>
	length ? ((n % length) + length) % length : n

const resultsOf = (
	loaded: Loaded,
	query: string,
	scope: number | undefined
): Results => {
	const { index } = loaded
	const inScope = (page: number) =>
		scope === undefined || index.pages[page].section === scope
	if (!query.trim()) {
		// before typing, the scope's pages
		const groups = new Map<number, Group>()
		let count = 0
		for (const [i, page] of index.pages.entries()) {
			if (
				scope === undefined ?
					unscoped.has(index.sections[page.section])
				:	page.section !== scope
			)
				continue
			count++
			const group = groups.get(page.section) ?? {
				label: index.sections[page.section],
				hits: []
			}
			groups.set(page.section, group)
			if (group.hits.length < hitsPerGroup * 2) {
				group.hits.push({
					key: `search-page-${i}`,
					href: page.url,
					page: true,
					title: page.title,
					snippet: page.description
				})
			}
		}
		return { groups: [...groups.values()], count }
	}
	const results = loaded.search.search(query, {
		filter: result => inScope(result.page as number),
		boostDocument: boostOf(loaded, query, homeSectionOf(loaded))
	})
	const groups = new Map<number, Group>()
	for (const result of results) {
		const entry = index.entries[result.id as number]
		const page = index.pages[entry.page]
		let group = groups.get(entry.page)
		if (!group) {
			if (groups.size === maxGroups) continue
			group = {
				label: `${index.sections[page.section]} / ${page.title}`,
				hits: []
			}
			groups.set(entry.page, group)
		}
		if (group.hits.length === hitsPerGroup) continue
		group.hits.push({
			key: `search-hit-${result.id}`,
			href: entry.id ? `${page.url}#${entry.id}` : page.url,
			page: !entry.id,
			title: highlight(entry.heading || page.title, result),
			snippet: excerpt(entry.text || page.description, result)
		})
	}
	return { groups: [...groups.values()], count: results.length }
}

const excerptRadius = 60

const matcherOf = (result: SearchResult) => {
	const terms = result.terms.filter(Boolean)
	return terms.length ?
			new RegExp(
				`(${terms.map(term => term.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")).join("|")})`,
				"gi"
			)
		:	undefined
}

const marked = (text: string, matcher: RegExp | undefined): ReactNode =>
	matcher ?
		text
			.split(matcher)
			.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
	:	text

const highlight = (text: string, result: SearchResult) =>
	marked(text, matcherOf(result))

/** moves `start` forward to the beginning of a word, but never past `limit` */
const wordStart = (text: string, start: number, limit: number) => {
	if (start === 0) return 0
	const space = text.slice(start - 1, limit).search(/\s/)
	return space === -1 ? limit : start + space
}

/** moves `end` back to the end of a word, but never before `floor` */
const wordEnd = (text: string, end: number, floor: number) => {
	if (end >= text.length) return text.length
	const space = text.slice(floor, end + 1).search(/\s\S*$/)
	return space === -1 ? end : floor + space
}

/** the words around the first matched term, with matches marked */
const excerpt = (text: string, result: SearchResult): ReactNode => {
	const lower = text.toLowerCase()
	const first = Math.min(
		...result.terms.map(term => lower.indexOf(term)).filter(i => i !== -1),
		text.length
	)
	const found = first < text.length
	const start =
		found ? wordStart(text, Math.max(0, first - excerptRadius), first) : 0
	const end = wordEnd(text, start + excerptRadius * 3, found ? first : 0)
	const slice =
		(start > 0 ? "…" : "") +
		text.slice(start, end).trimEnd() +
		(end < text.length ? "…" : "")
	return marked(slice, matcherOf(result))
}
