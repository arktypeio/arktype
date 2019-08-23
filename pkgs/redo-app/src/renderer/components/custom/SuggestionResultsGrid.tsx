import React from "react"
import { GridList, GridListTile } from "@material-ui/core"
import { component } from "blocks"
import { SuggestionCard } from "custom"
import { Card, useTheme } from "redo-components"

export type SuggestionData = {
    name: string
    type: string
    description?: string
}

export type SuggestionResultsGridProps = {
    suggestions: SuggestionData[]
}

export const SuggestionResultsGrid = component({
    name: "SuggestionResultsGrid",
    defaultProps: {} as Partial<SuggestionResultsGridProps>,
    query: { cardFilter: null }
})(({ suggestions, data }) => {
    const { cardFilter } = data
    const theme = useTheme()
    const suggestionCards = suggestions
        .filter(({ name, description }) =>
            name
                .concat(description ? description : "")
                .toLowerCase()
                .includes(cardFilter!.toLowerCase())
        )
        .map(({ name, type, description }) => (
            <GridListTile key={name}>
                <SuggestionCard {...{ name, type, description }} />
            </GridListTile>
        ))
    return (
        <Card
            style={{
                width: "100%",
                height: "100%"
            }}
        >
            <GridList
                style={{
                    minHeight: "100%",
                    //theme.spacing(90),
                    minWidth: "100%"
                    // theme.spacing(90),
                    //  padding: theme.spacing(2)
                }}
                cols={4}
            >
                {suggestionCards}
            </GridList>
        </Card>
    )
})
