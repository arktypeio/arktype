import React from "react"

export declare namespace AnchorAliases {
	export type Props = Record<string, true | undefined>
}

/**
 * create multiple anchor aliases for Markdown headers
 *
 * @example
 * <AnchorAliases old-id legacy-id alternate-name />
 */
export const AnchorAliases = (aliases: AnchorAliases.Props) => (
	<>
		{Object.keys(aliases).map(id => (
			<a key={id} id={id} />
		))}
	</>
)
