import React, { CSSProperties } from "react"
import { component } from "blocks"
import { SuggestionCard } from "custom"
import { Card, useTheme, Row } from "redo-components"

export type SuggestionData = {
    name: string
    kind: string
    description?: string
}

export type SuggestionResultsGridProps = {
    suggestions: SuggestionData[]
    style?: CSSProperties
}

export const SuggestionResultsGrid = component({
    name: "SuggestionResultsGrid",
    defaultProps: {} as Partial<SuggestionResultsGridProps>,
    query: { cardFilter: null }
})(({ suggestions, data, style }) => {
    const { cardFilter } = data
    const theme = useTheme()

    const suggestionCards = suggestions
        .filter(({ name, description }) =>
            name
                .concat(description ? description : "")
                .toLowerCase()
                .includes(cardFilter!.toLowerCase())
        )
        .map(({ name, kind: kind, description }) => (
            <div
                key={name}
                style={{
                    width: theme.spacing(25),
                    height: theme.spacing(25)
                }}
            >
                <SuggestionCard {...{ name, kind, description }} />
            </div>
        ))
    return (
        <Card
            style={{
                width: "100%",
                height: "100%",
                ...style
            }}
        >
            <Row
                wrap="wrap"
                style={{
                    width: "100%",
                    padding: theme.spacing(2)
                }}
            >
                {suggestionCards}
            </Row>
        </Card>
    )
})
