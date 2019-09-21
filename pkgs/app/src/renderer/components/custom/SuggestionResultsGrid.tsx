import React, { CSSProperties } from "react"
import { SuggestionCard } from "custom"
import { store } from "renderer/common"
import { Card, Row, Icons, IconButton } from "@re-do/components"
import { useQuery } from "@apollo/react-hooks"
import { metadata, Test } from "@re-do/model"
import { test } from "@re-do/test"

type SuggestionKind = "test" | "other"

export type SuggestionData = {
    name: string
    kind: SuggestionKind
    description?: string
}

const welcomeSuggestion: SuggestionData = {
    name: "👆Hey there!",
    kind: "other",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!"
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

const useSuggestions = (): SuggestionData[] => {
    const { cardFilter } = store.hooks.useQuery({ cardFilter: null })
    const { data, loading } = useQuery<{ getTests: Test[] }>(
        metadata.test.gql.get,
        {
            fetchPolicy: "no-cache"
        }
    )
    return loading
        ? []
        : data && data.getTests && data.getTests.length > 0
        ? data.getTests
              .map(({ name, tags }) => ({
                  name,
                  kind: "test" as const,
                  description: tags.join(", ")
              }))
              .filter(({ name, description }) =>
                  name
                      .concat(description ? description : "")
                      .toLowerCase()
                      .includes(cardFilter.toLowerCase())
              )
        : [welcomeSuggestion]
}

export const SuggestionResultsGrid = ({
    style
}: SuggestionResultsGridProps) => {
    const suggestions = useSuggestions()
    const suggestionCards = suggestions.map(({ name, kind, description }) => (
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
}
