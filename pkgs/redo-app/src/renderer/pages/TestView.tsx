import React from "react"
import { HomeActionsRow } from "custom"
import { Column, Row, SecondaryButton, TreeView } from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"
import { BrowserEvent } from "redo-model"

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
                      tests[name] = { tags, steps }
                      return tests
                  },
                  {} as Record<string, FeatureOptions>
              )
            : {}
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
