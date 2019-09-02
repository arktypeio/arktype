import React, { CSSProperties } from "react"
import { component } from "blocks"
import { SuggestionCard } from "custom"
import { Card, Row } from "@re-do/components"

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
                    width: 200,
                    height: 200
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
                    padding: 16
                }}
            >
                {suggestionCards}
            </Row>
        </Card>
    )
})
