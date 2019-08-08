import React, { FC } from "react"
import { HomeActionsRow, SuggestionResultsGrid } from "custom"
import { Column } from "redo-components"
import { suggestionData } from "custom/FakeSuggestions"

export const Home: FC = () => {
    return (
        <Column justify="flex-start">
            <HomeActionsRow />
            <SuggestionResultsGrid suggestions={suggestionData} />
        </Column>
    )
}
