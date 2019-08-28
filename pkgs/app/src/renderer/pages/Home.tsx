import React from "react"
import { useQuery } from "@apollo/react-hooks"
import { Column } from "@re-do/components"
import { metadata, Test } from "@re-do/model"
import { RedoAppBar, SuggestionResultsGrid, SuggestionData } from "custom"

const welcomeSuggestion: SuggestionData = {
    name: "👆Hey there!",
    kind: "Onboarding",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!"
}

export const Home = () => {
    const { data, loading } = useQuery<{ getTest: Test[] }>(
        metadata.test.gql.get,
        {
            fetchPolicy: "no-cache"
        }
    )
    return (
        <Column justify="center" full={true}>
            <RedoAppBar>{["newTest", "search", "account"]}</RedoAppBar>
            <SuggestionResultsGrid
                suggestions={
                    loading
                        ? []
                        : data && data.getTest && data.getTest.length > 0
                        ? data.getTest.map(({ name, tags }) => ({
                              name,
                              kind: "test",
                              description: JSON.stringify(tags)
                          }))
                        : [welcomeSuggestion]
                }
                style={{ padding: 16 }}
            />
        </Column>
    )
}
