import React from "react"
import { Theme, GridList, GridListTile } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { component } from "blocks"
import { SuggestionCard } from "custom/cards"
import { Card } from "redo-components"

const stylize = makeStyles((theme: Theme) => ({
    gridList: {
        minHeight: theme.spacing(90),
        minWidth: theme.spacing(180),
        padding: theme.spacing(2)
    }
}))

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
})(({ suggestions, data: { cardFilter } }) => {
    const { gridList } = stylize({})
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
        <Card>
            <GridList className={gridList} cols={4}>
                {suggestionCards}
            </GridList>
        </Card>
    )
})
