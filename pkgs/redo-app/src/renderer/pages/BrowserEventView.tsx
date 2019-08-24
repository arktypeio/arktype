import React from "react"
import { Column, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { RedoAppBar } from "custom"

import gql from "graphql-tag"
import { Tag } from "redo-model"

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
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {data && data.getBrowserEvent ? (
                <Tree labelKey="value">{data.getBrowserEvent}</Tree>
            ) : null}
        </Column>
    )
}
