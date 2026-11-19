/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { compileMdx } from "../compile.ts"

type SaysProps = { word: string }

const Says = ({ word }: SaysProps) => word

const render = async (body: string) => {
	const { Content } = await compileMdx(body)
	return renderToStaticMarkup(
		createElement(Content, { components: { Says, Claim: Says, Block: Says } })
	)
}

contextualize(() => {
	it("keeps the space between components side by side in a <p>", async () => {
		attest(
			await render('<p>\n\t<Says word="One." /> <Says word="Two." />\n</p>')
		).snap("<p>One. Two.</p>")
	})

	it("adds no space where the source has none", async () => {
		attest(
			await render('<p>\n\t<Says word="un" /><Says word="broken" />\n</p>')
		).snap("<p>unbroken</p>")
	})

	it("gives a sentence alone on its line a paragraph", async () => {
		attest(await render('Before.\n\n<Claim word="Alone." />\n\nAfter.')).snap(
			"<p>Before.</p>\n<p>Alone.</p>\n<p>After.</p>"
		)
	})

	it("leaves a component that isn't a sentence a block", async () => {
		attest(await render('<Block word="table" />')).snap("table")
	})

	it("leaves components side by side outside a <p> as blocks", async () => {
		attest(
			await render('<div>\n\t<Says word="a" /> <Says word="b" />\n</div>')
		).snap("<div>ab</div>")
	})
})
