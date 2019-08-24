import React from "react"
import { component } from "blocks"
import { SuggestionCard } from "custom"
import { Card, useTheme, Row } from "redo-components"

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
            <div
                key={name}
                style={{
                    width: theme.spacing(25),
                    height: theme.spacing(25)
                }}
            >
                <SuggestionCard {...{ name, type, description }} />
            </div>
        ))
    return (
        <Card
            style={{
                width: "100%",
                height: "100%"
            }}
        >
            <Row
                wrap="wrap"
                style={{
                    height: "100%",
                    width: "100%",
                    padding: theme.spacing(2)
                }}
            >
                {suggestionCards}
            </Row>
        </Card>
    )
})
