import React, { CSSProperties } from "react"
import { SuggestionCard } from "custom"
import { store } from "renderer/common"
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

export const SuggestionResultsGrid = ({
    suggestions,
    style
}: SuggestionResultsGridProps) => {
    const { cardFilter } = store.hooks.useQuery({ cardFilter: null })
    const suggestionCards = suggestions
        .filter(({ name, description }) =>
            name
                .concat(description ? description : "")
                .toLowerCase()
                .includes(cardFilter.toLowerCase())
        )
        .map(({ name, kind, description }) => (
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
                    padding: 16
                }}
            >
                {suggestionCards}
            </Row>
        </Card>
    )
}
