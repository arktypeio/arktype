import { Resvg } from "@resvg/resvg-js"
import { create, type Font } from "fontkit"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { decompress } from "wawoff2"
import { leaderboards, type CategoryId } from "./bench/leaderboard.ts"
import {
	assertNamesWellKnown,
	assertStandings,
	claims,
	draftOf,
	ordinal
} from "./claims.ts"
import { getPageTree } from "./content/docs.ts"
import { docsDir, publicDir } from "./content/paths.ts"

const width = 1200
const height = 600
const padX = 64
const padY = 52

const colors = {
	background: "#080d17",
	surface: "#0c1320",
	ink: "#eeeeee",
	ink2: "#b6bacb",
	ink3: "#888899",
	gold: "#f5cf8f",
	copper: "#ba7e41",
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
	strike?: boolean
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
	headline: {
		family: "sans",
		weight: 800,
		size: 68,
		fill: colors.ink,
		tracking: -0.035
	},
	boardTitle: {
		family: "sans",
		weight: 750,
		size: 34,
		fill: colors.ink2,
		tracking: -0.02
	},
	label: { family: "mono", weight: 400, size: 17, fill: colors.ink2 },
	place: {
		family: "sans",
		weight: 800,
		size: 58,
		fill: colors.gold,
		tracking: -0.04
	},
	of: { family: "mono", weight: 400, size: 17, fill: colors.ink3 },
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
	let svg = `<path fill="${style.fill}" d="${d}"/>`
	if (style.strike) {
		const thickness = 0.08 * style.size
		const y = baseline - (font.xHeight * scale) / 2 - thickness / 2
		svg += `<rect fill="${style.fill}" x="${x}" y="${y}" width="${widthOf(text.trimEnd(), style)}" height="${thickness}"/>`
	}
	return svg
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

/** the logo and name on the left and where the card links on the right */
const header = (site: string) => {
	const middle = padY + brandSize / 2
	const centered = (style: Style) => {
		const lineHeight = normalLineHeight(style)
		return baselineOf(middle - lineHeight / 2, lineHeight, style)
	}
	return (
		logo.replace(
			"<svg ",
			`<svg x="${padX}" y="${padY}" width="${brandSize}" height="${brandSize}" `
		) +
		outline(
			"ArkType",
			styles.brand,
			padX + brandSize + 14,
			centered(styles.brand)
		) +
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
<linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#101d2f"/><stop offset="1" stop-color="${colors.surface}"/>
</linearGradient>
</defs>
<rect width="${width}" height="${height}" fill="${colors.background}"/>
<rect width="${width}" height="${height}" fill="url(#glowGold)"/>
<rect width="${width}" height="${height}" fill="url(#glowBlue)"/>
${body}
</svg>`

const categoryLabels: Record<CategoryId, string> = {
	speed: "validation speed",
	startup: "startup",
	size: "bundle size"
}

/** the homepage's card: its headline, its board's title and ArkType's places */
const homeCard = () => {
	const h1 = block(
		[[draftOf(claims.headline), styles.headline]],
		padX,
		padY + brandSize + 34,
		{ lineHeight: 68 * 1.02 }
	)
	const pick = styles.boardTitle
	const boardTitle = draftOf(claims.boardTitle)
	const lead = boardTitle.replace(/ ?Pick 3\.$/, "")
	const title = block(
		lead === boardTitle ?
			[[boardTitle, pick]]
		:	[
				[`${lead} `, pick],
				["Pick 2. ", { ...pick, fill: colors.ink3, strike: true }],
				["Pick 3.", { ...pick, fill: colors.gold }]
			],
		padX,
		h1.bottom + 16
	)

	const gap = 20
	const cardWidth = (width - 2 * padX - 2 * gap) / 3
	const cardHeight = 150
	const cardTop = height - padY - cardHeight
	const cards = (Object.keys(categoryLabels) as CategoryId[]).map((id, i) => {
		const { standings } = leaderboards[id]
		const place = standings.findIndex(s => s.library === "ArkType") + 1
		if (!place) throw new Error(`ArkType isn't ranked for ${id}`)
		const x = padX + i * (cardWidth + gap)
		const label = block(
			[[categoryLabels[id], styles.label]],
			x + 22,
			cardTop + 18
		)
		const placed = block(
			[[ordinal(place), styles.place]],
			x + 22,
			label.bottom + 8,
			{ lineHeight: 58 }
		)
		const of = block(
			[[`of ${standings.length} libraries`, styles.of]],
			x + 22,
			placed.bottom + 8
		)
		return `<rect x="${x + 0.5}" y="${cardTop + 0.5}" width="${cardWidth - 1}" height="${cardHeight - 1}" rx="18" fill="url(#surface)" stroke="${colors.copper}" stroke-opacity="0.3"/>${label.svg}${placed.svg}${of.svg}`
	})

	if (title.bottom > cardTop) {
		throw new Error(
			`the homepage's card overlaps its places by ${title.bottom - cardTop}px`
		)
	}
	return card(header("arktype.io") + h1.svg + title.svg + cards.join(""))
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
