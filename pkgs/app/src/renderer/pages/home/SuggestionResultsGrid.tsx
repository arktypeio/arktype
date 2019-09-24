import React, { CSSProperties } from "react"
import { SuggestionCard } from "./SuggestionCard"
import { store } from "renderer/common"
import { Card, Row } from "@re-do/components"
import { useQuery } from "@apollo/react-hooks"
import { metadata, Test } from "@re-do/model"
import { test } from "@re-do/test"

const welcomeSuggestion = {
    name: "👆Hey there!",
    kind: "other",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!"
}

const useValues = () => {
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
        ? data.getTests.filter(test =>
              JSON.stringify(test)
                  .toLowerCase()
                  .includes(cardFilter.toLowerCase())
          )
        : [welcomeSuggestion]
}

export const SuggestionResultsGrid = () => {
    const values = useValues()
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
                    width: "100%",
                    padding: 16
                }}
            >
                {values.map(value => (
                    <div
                        key={name}
                        style={{
                            width: 200,
                            height: 200
                        }}
                    >
                        <SuggestionCard kind="test" value={value} />
                    </div>
                ))}
            </Row>
        </Card>
    )
}
