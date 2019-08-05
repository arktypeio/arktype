import React from "react"
import { HomeActionsRow, SuggestionResultsGrid } from "custom"
import {
    Column,
    Row,
    SecondaryButton,
    ContentCard,
    TreeView
} from "redo-components"
import { suggestionData } from "custom/FakeSuggestions"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"
import { User, BrowserEvent } from "redo-model"

const GET_TESTS = gql`
    query {
        getTest {
            name
            steps {
                type
                selector
                value
            }
            tags
            user {
                email
            }
        }
    }
`

type TestData = {
    getTest: {
        name: string
        tags: string[]
        steps: BrowserEvent[]
    }[]
}

type FeatureOptions = { tags: string[]; steps: BrowserEvent[] }

export const TestView = () => {
    const { data } = useQuery<TestData>(GET_TESTS)
    const formattedData =
        data && data.getTest
            ? data.getTest.reduce(
                  (tests, { name, tags, steps }) => {
                      let features = {} as FeatureOptions
                      if (tags) {
                          features.tags = tags
                      }
                      if (steps) {
                          features.steps = steps
                      }
                      tests[name] = features
                      return tests
                  },
                  {} as any
              )
            : {}
    console.log(formattedData)
    return (
        <Column justify="flex-start">
            <Row>
                <SecondaryButton
                    onClick={() => store.mutate({ page: Page.Home })}
                >
                    Home
                </SecondaryButton>
                <HomeActionsRow />
            </Row>
            <TreeView from={formattedData} />
        </Column>
    )
}
