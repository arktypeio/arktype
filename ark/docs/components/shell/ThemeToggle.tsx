"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useEffect, useSyncExternalStore } from "react"
import { reducedMotion } from "../motion.ts"
import { lightQuery, themeColors, themeKey, type Theme } from "./theme.ts"

const root = () => document.documentElement

const subscribe = (onChange: () => void) => {
	const observer = new MutationObserver(onChange)
	observer.observe(root(), { attributeFilter: ["data-theme"] })
	return () => observer.disconnect()
}

const currentTheme = (): Theme =>
	root().dataset.theme === "light" ? "light" : "dark"

/** the theme on screen, or undefined before hydration */
export const useTheme = (): Theme | undefined =>
	useSyncExternalStore(subscribe, currentTheme, () => undefined)

const setThemeColor = (theme: Theme) => {
	for (const meta of document.querySelectorAll('meta[name="theme-color"]'))
		meta.setAttribute("content", themeColors[theme])
}

/**
 * stores a choice only while it differs from the system's, so choosing the
 * system's theme follows it again
 */
const persist = (theme: Theme) => {
	const system: Theme = matchMedia(lightQuery).matches ? "light" : "dark"
	try {
		if (theme === system) localStorage.removeItem(themeKey)
		else localStorage.setItem(themeKey, theme)
	} catch {
		// storage is off: the choice lasts until the page closes
	}
}

/** a circular reveal from where it was pressed, where view transitions run */
const switchTheme = (next: Theme, origin: { x: number; y: number }) => {
	const html = root()
	const apply = () => {
		html.dataset.theme = next
		setThemeColor(next)
	}
	persist(next)
	// colors snap rather than fade, so the snapshot is the final frame
	html.dataset.switching = ""
	const done = () => delete html.dataset.switching
	if (!document.startViewTransition || reducedMotion()) {
		apply()
		requestAnimationFrame(() => requestAnimationFrame(done))
		return
	}
	const x = Math.min(Math.max(origin.x, 0), innerWidth)
	const y = Math.min(Math.max(origin.y, 0), innerHeight)
	html.style.setProperty("--vt-x", `${x}px`)
	html.style.setProperty("--vt-y", `${y}px`)
	html.style.setProperty(
		"--vt-r",
		`${Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)))}px`
	)
	document.startViewTransition(apply).finished.finally(done)
}

/**
 * Switches between ArkDark and ArkLight. CSS shows the icon for the theme on
 * screen, which the head script sets before the page paints, so nothing
 * changes as this hydrates.
 */
export const ThemeToggle = ({ className }: { className: string }) => {
	const theme = useTheme()

	// the head script runs before the theme-color tags exist
	useEffect(() => {
		if (theme) setThemeColor(theme)
	}, [theme])

	return (
		<button
			type="button"
			className={`theme-toggle ${className}`}
			aria-label="Light theme"
			aria-pressed={theme ? theme === "light" : undefined}
			onClick={e => {
				const rect = e.currentTarget.getBoundingClientRect()
				// keyboard clicks report 0,0: reveal from the button instead
				const origin =
					e.detail ?
						{ x: e.clientX, y: e.clientY }
					:	{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				switchTheme(currentTheme() === "light" ? "dark" : "light", origin)
			}}
		>
			<SunIcon className="only-light" aria-hidden />
			<MoonIcon className="only-dark" aria-hidden />
		</button>
	)
}
