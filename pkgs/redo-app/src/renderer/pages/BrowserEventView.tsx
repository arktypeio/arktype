import React from "react"
import { HomeActionsRow } from "custom"
import { Column, Row, Button, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"
import { BrowserEvent, Tag } from "redo-model"

const GET_BROWSER_EVENTS = gql`
    query {
        getBrowserEvent {
            tags {
                id
            }
            selector
            type
            value
        }
    }
`

type BrowserEventData = {
    getBrowserEvent: {
        tags: Tag[]
        selector: string
        type: string
        value: string
    }[]
}

export const BrowserEventView = () => {
    const { data } = useQuery<BrowserEventData>(GET_BROWSER_EVENTS)
    return (
        <Column justify="flex-start">
            <Row>
                <Button
                    kind="secondary"
                    onClick={() => store.mutate({ page: Page.Home })}
                >
                    Home
                </Button>
                <HomeActionsRow />
            </Row>
            {data && data.getBrowserEvent ? (
                <Tree from={data.getBrowserEvent} labelKey="value" />
            ) : null}
        </Column>
    )
}
