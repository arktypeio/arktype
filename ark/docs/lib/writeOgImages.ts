import { Resvg } from "@resvg/resvg-js"
import { create, type Font } from "fontkit"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { decompress } from "wawoff2"
import { heroLine, heroStats } from "../components/home/boardFacts.ts"
import {
	assertNamesWellKnown,
	assertStandings,
	claims,
	draftOf
} from "./claims.ts"
import { getPageTree } from "./content/docs.ts"
import { docsDir, publicDir } from "./content/paths.ts"

const width = 1200
const height = 600
const padX = 64
const padY = 52

const colors = {
	background: "#080d17",
	ink: "#eeeeee",
	ink2: "#b6bacb",
	ink3: "#888899",
	gold: "#f5cf8f",
	blue: "#408fde"
}

type Family = "sans" | "mono"

const fontFiles: Record<Family, string> = {
	sans: "atkinson-hyperlegible-next-latin-wght-normal.woff2",
	mono: "cascadia-code-latin-wght-normal.woff2"
}

// fontkit can't apply a variable font's weight to WOFF2, so they're decoded
// to TrueType first
const variableFonts = {} as Record<Family, Font>

const loadFonts = async () => {
	for (const family of Object.keys(fontFiles) as Family[]) {
		variableFonts[family] ??= create(
			Buffer.from(
				await decompress(
					readFileSync(join(docsDir, "app", "fonts", fontFiles[family]))
				)
			)
		) as Font
	}
}

const instances = new Map<string, Font>()

const fontOf = (family: Family, weight: number): Font => {
	const key = `${family}${weight}`
	let font = instances.get(key)
	if (!font) {
		font = variableFonts[family].getVariation({ wght: weight })
		instances.set(key, font)
	}
	return font
}

type Style = {
	family: Family
	weight: number
	size: number
	fill: string
	/** letter-spacing in em */
	tracking?: number
}

type Span = [text: string, style: Style]

const styles = {
	brand: {
		family: "sans",
		weight: 750,
		size: 30,
		fill: colors.ink,
		tracking: -0.01
	},
	site: { family: "mono", weight: 500, size: 22, fill: colors.ink3 },
	pill: { family: "mono", weight: 500, size: 17, fill: colors.gold },
	headline: {
		family: "sans",
		weight: 800,
		size: 56,
		fill: colors.ink,
		tracking: -0.04
	},
	heroLine: {
		family: "sans",
		weight: 800,
		size: 56,
		fill: colors.gold,
		tracking: -0.04
	},
	statNum: {
		family: "sans",
		weight: 800,
		size: 108,
		fill: colors.gold,
		tracking: -0.045
	},
	statBold: {
		family: "sans",
		weight: 700,
		size: 19,
		fill: colors.ink,
		tracking: -0.015
	},
	statLight: {
		family: "sans",
		weight: 400,
		size: 19,
		fill: colors.ink2,
		tracking: -0.015
	},
	statScope: { family: "mono", weight: 400, size: 14, fill: colors.ink3 },
	kicker: { family: "mono", weight: 400, size: 22, fill: colors.ink3 },
	title: {
		family: "sans",
		weight: 800,
		size: 132,
		fill: colors.ink,
		tracking: -0.035
	},
	description: { family: "sans", weight: 500, size: 36, fill: colors.ink2 }
} satisfies Record<string, Style>

const widthOf = (text: string, style: Style) => {
	const font = fontOf(style.family, style.weight)
	const { positions } = font.layout(text)
	const scale = style.size / font.unitsPerEm
	return positions.reduce(
		(sum, p) => sum + p.xAdvance * scale + (style.tracking ?? 0) * style.size,
		0
	)
}

/** the text as outlines, so rendering needs no fonts */
const outline = (text: string, style: Style, x: number, baseline: number) => {
	const font = fontOf(style.family, style.weight)
	const { glyphs, positions } = font.layout(text)
	const scale = style.size / font.unitsPerEm
	let d = ""
	let penX = x
	for (const [i, glyph] of glyphs.entries()) {
		d += glyph.path
			.scale(scale, -scale)
			.translate(penX + positions[i].xOffset * scale, baseline)
			.toSVG()
		penX += positions[i].xAdvance * scale + (style.tracking ?? 0) * style.size
	}
	return `<path fill="${style.fill}" d="${d}"/>`
}

/** CSS's `line-height: normal` */
const normalLineHeight = (style: Style) => {
	const font = fontOf(style.family, style.weight)
	return (
		((font.ascent - font.descent + font.lineGap) * style.size) / font.unitsPerEm
	)
}

/** where CSS puts the baseline of a line box of the given height */
const baselineOf = (top: number, lineHeight: number, style: Style) => {
	const font = fontOf(style.family, style.weight)
	const scale = style.size / font.unitsPerEm
	const content = (font.ascent - font.descent) * scale
	return top + (lineHeight - content) / 2 + font.ascent * scale
}

/**
 * Lays out spans as wrapped lines starting at `top`, like a block whose
 * line-height is `lineHeight`, and returns its outlines and its bottom.
 */
const block = (
	spans: Span[],
	x: number,
	top: number,
	{
		maxWidth = width - 2 * padX,
		lineHeight = normalLineHeight(spans[0][1])
	}: { maxWidth?: number; lineHeight?: number } = {}
) => {
	const words = spans.flatMap(([text, style]) =>
		text.split(/(?<= )/).map((word): Span => [word, style])
	)
	const lines: Span[][] = [[]]
	let lineWidth = 0
	for (const [word, style] of words) {
		const wordWidth = widthOf(word, style)
		const line = lines.at(-1)!
		if (line.length && lineWidth + widthOf(word.trimEnd(), style) > maxWidth) {
			lines.push([[word, style]])
			lineWidth = wordWidth
		} else {
			line.push([word, style])
			lineWidth += wordWidth
		}
	}
	let svg = ""
	for (const [i, line] of lines.entries()) {
		const baseline = baselineOf(top + i * lineHeight, lineHeight, line[0][1])
		let penX = x
		for (const [word, style] of line) {
			svg += outline(word, style, penX, baseline)
			penX += widthOf(word, style)
		}
	}
	return { svg, bottom: top + lines.length * lineHeight }
}

const logo = readFileSync(join(publicDir, "image", "favicon.svg"), "utf8")
	.replace(/<\?xml[^>]*>/, "")
	.replace(/<!--.*?-->/g, "")

const brandSize = 42

/** the logo and name on the left, optional badge beside it, and where the card links on the right */
const header = (site: string, badge?: string) => {
	const middle = padY + brandSize / 2
	const centered = (style: Style) => {
		const lineHeight = normalLineHeight(style)
		return baselineOf(middle - lineHeight / 2, lineHeight, style)
	}
	const brandX = padX + brandSize + 14
	let pillSvg = ""
	if (badge) {
		const pillX = brandX + widthOf("ArkType", styles.brand) + 18
		const textW = widthOf(badge, styles.pill)
		const padLeft = 14
		const dotR = 3.5
		const dotGap = 9
		const padRight = 14
		const pillH = 30
		const pillW = padLeft + dotR * 2 + dotGap + textW + padRight
		const pillY = middle - pillH / 2
		pillSvg =
			`<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${colors.gold}" fill-opacity="0.09" stroke="${colors.gold}" stroke-opacity="0.45" stroke-width="1"/>` +
			`<circle cx="${pillX + padLeft + dotR}" cy="${middle}" r="${dotR}" fill="${colors.gold}"/>` +
			outline(
				badge,
				styles.pill,
				pillX + padLeft + dotR * 2 + dotGap,
				centered(styles.pill)
			)
	}
	return (
		logo.replace(
			"<svg ",
			`<svg x="${padX}" y="${padY}" width="${brandSize}" height="${brandSize}" `
		) +
		outline("ArkType", styles.brand, brandX, centered(styles.brand)) +
		pillSvg +
		outline(
			site,
			styles.site,
			width - padX - widthOf(site, styles.site),
			centered(styles.site)
		)
	)
}

const card = (
	body: string
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<defs>
<radialGradient id="glowBlue" gradientUnits="userSpaceOnUse" cx="1056" cy="-60" r="900" gradientTransform="translate(0 -60) scale(1 ${420 / 900}) translate(0 60)">
<stop offset="0" stop-color="${colors.blue}" stop-opacity="0.16"/><stop offset="0.7" stop-color="${colors.blue}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="glowGold" gradientUnits="userSpaceOnUse" cx="-60" cy="660" r="700" gradientTransform="translate(0 660) scale(1 ${380 / 700}) translate(0 -660)">
<stop offset="0" stop-color="${colors.gold}" stop-opacity="0.09"/><stop offset="0.7" stop-color="${colors.gold}" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${width}" height="${height}" fill="${colors.background}"/>
<rect width="${width}" height="${height}" fill="url(#glowGold)"/>
<rect width="${width}" height="${height}" fill="url(#glowBlue)"/>
${body}
</svg>`

/** the homepage's card: its hero headline and the three Zod 4 headline stats */
const homeCard = () => {
	const h1 = block(
		[[draftOf(claims.headline), styles.headline]],
		padX,
		padY + brandSize + 36,
		{ lineHeight: 56 * 1.05 }
	)
	const line = block([[heroLine, styles.heroLine]], padX, h1.bottom + 4, {
		lineHeight: 56 * 1.05
	})

	const gap = 28
	const colWidth = (width - 2 * padX - 2 * gap) / 3
	const statTop = line.bottom + 42
	let maxBottom = statTop

	const stats = heroStats().map((stat, i) => {
		const x = padX + i * (colWidth + gap)
		const num = block([[stat.value, styles.statNum]], x, statTop, {
			maxWidth: colWidth,
			lineHeight: 108 * 0.96
		})
		const what = block(
			[
				[stat.unit, styles.statBold],
				[" than Zod 4", styles.statLight]
			],
			x,
			num.bottom + 14,
			{ maxWidth: colWidth, lineHeight: 19 * 1.3 }
		)
		// the latin-subsetted Cascadia Code font omits U+2192, but its `->` ligature draws the arrow
		const scope = block(
			[[stat.scope.replaceAll("→", "->"), styles.statScope]],
			x,
			what.bottom + 8,
			{ maxWidth: colWidth, lineHeight: 14 * 1.45 }
		)
		if (scope.bottom > maxBottom) maxBottom = scope.bottom
		const glow = `<radialGradient id="statGlow${i}" cx="${x + 95}" cy="${statTop + 56}" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${colors.gold}" stop-opacity="0.14"/><stop offset="1" stop-color="${colors.gold}" stop-opacity="0"/></radialGradient><rect width="${width}" height="${height}" fill="url(#statGlow${i})"/>`
		return glow + num.svg + what.svg + scope.svg
	})

	if (maxBottom > height - padY - 38) {
		throw new Error(
			`the homepage's card overflows by ${maxBottom - height + padY + 38}px`
		)
	}
	const footY = height - padY - 8
	const footRule = `<line x1="${padX}" y1="${footY - 22}" x2="${width - padX}" y2="${footY - 22}" stroke="${colors.ink3}" stroke-opacity="0.22" stroke-width="1"/>`
	const footText = outline(
		"Standard Schema · zero runtime deps · MIT · Vite, Next.js, esbuild, Bun",
		styles.statScope,
		padX,
		footY
	)
	return card(
		header("arktype.io", "3.0 · @ark/aot") +
			h1.svg +
			line.svg +
			stats.join("") +
			footRule +
			footText
	)
}

/** a post's card: its title, an "Announcing" title's version in gold, and its description */
const postCard = (title: string, description: string) => {
	const announced = /^Announcing (.+?)(?: (\d\S*))?$/.exec(title)
	const kicker = block(
		[[announced ? "// announcing" : "// blog", styles.kicker]],
		padX,
		padY + brandSize + 92
	)
	const heading = styles.title
	const h1 = block(
		announced?.[2] ?
			[
				[`${announced[1]} `, heading],
				[announced[2], { ...heading, fill: colors.gold }]
			]
		:	[[announced?.[1] ?? title, heading]],
		padX,
		kicker.bottom + 10,
		{ lineHeight: 132 * 1.02 }
	)
	// "pick 3." is gold wherever it appears, as on the homepage
	const sub = styles.description
	const spans = description
		.split(/(pick 3\.)/i)
		.filter(Boolean)
		.map(
			(text): Span => [
				text,
				/^pick 3\.$/i.test(text) ?
					{ ...sub, weight: 750, fill: colors.gold }
				:	sub
			]
		)
	const body = block(spans, padX, h1.bottom + 26, {
		maxWidth: 980,
		lineHeight: 36 * 1.3
	})
	if (body.bottom > height - padY) {
		throw new Error(
			`the card for "${title}" overflows by ${body.bottom - height + padY}px`
		)
	}
	return card(header("arktype.io/docs/blog") + kicker.svg + h1.svg + body.svg)
}

const writePng = (path: string, svg: string) => {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, new Resvg(svg).render().asPng())
}

/** a blog page's description and its cards' (the index's), which state standings claims.ts can't render */
const blogCopyOf = (path: string, description: string) => [
	description,
	...[...readFileSync(path, "utf8").matchAll(/\bdescription="([^"]*)"/g)].map(
		([, card]) => card
	)
]

/**
 * Writes the social cards whose text comes from claims.ts or a page's
 * frontmatter, so they can't fall behind it: the homepage's og.png and each
 * blog post's ogImage. Throws if a blog description states a standing
 * the board doesn't back, or a blog post names a library the site may not.
 */
export const writeOgImages = async (): Promise<void> => {
	await loadFonts()
	writePng(join(publicDir, "image", "og.png"), homeCard())
	for (const { section, frontmatter, path } of getPageTree().pages) {
		if (section !== "blog") continue
		for (const copy of blogCopyOf(path, frontmatter.description))
			assertStandings(copy, path)
		assertNamesWellKnown(readFileSync(path, "utf8"), path)
		if (!frontmatter.ogImage) continue
		writePng(
			join(publicDir, "image", frontmatter.ogImage),
			postCard(frontmatter.title, frontmatter.description)
		)
	}
}
