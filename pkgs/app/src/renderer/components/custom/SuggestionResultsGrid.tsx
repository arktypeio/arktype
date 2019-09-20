import React, { CSSProperties } from "react"
import { SuggestionCard } from "custom"
import { store } from "renderer/common"
import { Card, Row, Icons, IconButton } from "@re-do/components"
import { test } from "@re-do/test"

type SuggestionKind = "test" | "other"

export type SuggestionData = {
    name: string
    kind: "test" | "other"
    description?: string
}

export type SuggestionResultsGridProps = {
    suggestions: SuggestionData[]
    style?: CSSProperties
}

type SuggestionExtras = { [K in SuggestionKind]: JSX.Element[] }

export const getSuggestionExtras = (): SuggestionExtras => {
    return {
        test: [<IconButton Icon={Icons.run} onClick={() => {}} />],
        other: []
    }
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
                <SuggestionCard {...{ name, description, extras }} />
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
}
