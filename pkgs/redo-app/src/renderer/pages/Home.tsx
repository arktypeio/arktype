import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { component } from "blocks"
import { HomeActionsRow, SuggestionResultsGrid } from "custom"
import { Column } from "blocks"
import { suggestionData } from "custom/FakeSuggestions"

const styles = (theme: Theme) => createStyles({})

export const Home = component({
    name: "Home",
    styles
})(({ classes }) => {
    return (
        <Column justify="flex-start">
            <HomeActionsRow />
            <SuggestionResultsGrid suggestions={suggestionData} />
        </Column>
    )
})
