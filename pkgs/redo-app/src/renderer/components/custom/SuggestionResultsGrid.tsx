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
            <GridListTile
                key={name}
                style={{
                    width: theme.spacing(25),
                    height: theme.spacing(25)
                }}
            >
                <SuggestionCard {...{ name, type, description }} />
            </GridListTile>
        ))
    let rowNumber = 1
    let columnNumber = suggestionCards.length
    let cardsRowWidth = theme.spacing(25) * suggestionCards.length
    console.log(`Screen width: ${screen.width}`)
    console.log(`cardsRowWidth: ${cardsRowWidth}`)
    while (cardsRowWidth > screen.width) {
        rowNumber++
        console.log("Row number increased")
        console.log(`Current rowNumber: ${rowNumber}`)
        columnNumber /= rowNumber
        columnNumber = Math.floor(columnNumber)
        console.log(`Current columnNumber: ${columnNumber}`)
        cardsRowWidth /= rowNumber
        console.log(`Current cardsRowWidth: ${cardsRowWidth}`)
    }
    console.log(`out of while statement columnNumber:${columnNumber} `)

    return (
        <Card
            style={{
                width: "100%",
                height: "100%"
            }}
        >
            <GridList
                style={{
                    height: "100%",
                    width: "100%",
                    padding: theme.spacing(2)

                    // height: "100%",
                    // width: "100%"
                }}
                cols={columnNumber}
            >
                {suggestionCards}
            </GridList>
        </Card>
    )
})
