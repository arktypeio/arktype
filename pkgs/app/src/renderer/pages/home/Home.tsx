import React from "react"
import { Column } from "@re-do/components"
import { RedoAppBar } from "renderer/components"
import { SuggestionResultsGrid } from "./SuggestionResultsGrid.js"

export const Home = () => {
    return (
        <Column justify="center" full={true}>
            <RedoAppBar>{["newTest", "search", "account"]}</RedoAppBar>
            <SuggestionResultsGrid />
        </Column>
    )
}
