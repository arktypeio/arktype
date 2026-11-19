import type { Paragraph, Root, Text } from "mdast"
import { SKIP, visit } from "unist-util-visit"

/** components that render a sentence or a phrase, with no element of their own to space them */
const sentences = ["Claim", "Headline", "StandingsAsOf"]

/**
 * MDX reads a line holding nothing but components as blocks, with no
 * paragraph around them and no whitespace between them. For components that
 * render text, that loses two things, which this puts back:
 *
 * - A sentence alone on its line is a paragraph. `<Claim id="appSize" />`
 *   between two paragraphs rendered as bare text in the article, wider than
 *   the prose and with no gap before the paragraph after it.
 *
 * - Components side by side in a `<p>` keep the space between them:
 *
 *   ```mdx
 *   <p>
 *   	<Claim id="loginSize" /> <Claim id="dynamicSize" />
 *   </p>
 *   ```
 *
 *   rendered as "…1.56 kB.Dynamic ArkType…". Writing `{" "}` there doesn't
 *   survive Prettier, which formats it back to a plain space. A `<p>` holds
 *   inline content only, so where its source had whitespace between two
 *   components, that whitespace was a space.
 */
export const keepComponentsInline = (tree: Root): void => {
	visit(tree, "mdxJsxFlowElement", (node, i, parent) => {
		if (node.name === "p") {
			node.children = node.children.flatMap((child, at) => {
				const previous = node.children[at - 1]
				const apart =
					previous?.type === "mdxJsxFlowElement" &&
					child.type === "mdxJsxFlowElement" &&
					previous.position !== undefined &&
					child.position !== undefined &&
					previous.position.end.offset! < child.position.start.offset!
				return apart ?
						[{ type: "text", value: " " } satisfies Text as never, child]
					:	[child]
			})
			return
		}
		if (
			parent?.type !== "root" ||
			i === undefined ||
			!sentences.includes(node.name ?? "") ||
			node.children.length > 0
		)
			return
		parent.children[i] = {
			type: "paragraph",
			children: [
				{ ...node, type: "mdxJsxTextElement", children: [] } satisfies Partial<
					Paragraph["children"][number]
				> as never
			]
		}
		return SKIP
	})
}

/** remark plugin for rendered pages: {@link keepComponentsInline} */
export const remarkKeepComponentsInline = () => keepComponentsInline
