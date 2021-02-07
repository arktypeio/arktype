import React from "react"
import { Button, Icons, TogglableMenu } from "@re-do/components"
import { SearchInput } from "./SearchInput"
import { Page } from "renderer/state"
import { store } from "renderer/common"

export const SearchBar = () => (
    <>
        <SearchInput
            style={{
                width: 320
            }}
            placeholder="Search your tests"
        />

        <TogglableMenu
            toggle={<Button Icon={Icons.dropdown} style={{ color: "white" }} />}
            options={{
                Tests: () => store.mutate({ page: Page.Detail }),
                Tags: () => store.mutate({ page: Page.Detail }),
                Steps: () => store.mutate({ page: Page.Detail })
            }}
        />
    </>
)
