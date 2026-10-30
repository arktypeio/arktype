/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import { searchSectionsOf } from "../search.ts"

contextualize(() => {
	it("table rows are indexed as sentences, skipping empty ones", () => {
		const body = `## Codes

| code | fields |
| --- | --- |
| \`domain\` | \`domain\`, like "string" |
| | |
| \`unit\` | the expected value. |
`
		attest(searchSectionsOf(body)).snap([
			{
				heading: "Codes",
				id: "codes",
				text: 'code · fields. domain · domain, like "string". unit · the expected value.'
			}
		])
	})
})
