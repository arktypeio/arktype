import React, { FC } from "react"
import { RedoAppBar, SuggestionResultsGrid } from "custom"
import { Column } from "redo-components"
import { suggestionData } from "custom/FakeSuggestions"

export const Home: FC = () => {
    return (
        <Column justify="center" full={true}>
            <RedoAppBar>{["newTest", "search", "account"]}</RedoAppBar>
            <SuggestionResultsGrid
                suggestions={suggestionData}
                style={{ padding: 16 }}
            />
        </Column>
    )
}
