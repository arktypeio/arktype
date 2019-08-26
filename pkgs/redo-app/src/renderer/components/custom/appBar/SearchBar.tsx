import React, { FC } from "react"
import { IconButton, Icons, Menu } from "redo-components"
import { SearchInput } from "../SearchInput"
import { Page } from "renderer/state"
import { store } from "renderer/common"

export type SearchBarProps = {}

export const SearchBar: FC<SearchBarProps> = ({}) => {
    return (
        <>
            <SearchInput
                style={{
                    width: 320
                }}
                placeholder="Search your tests"
            />

            <Menu>
                {{
                    toggle: (
                        <IconButton
                            Icon={Icons.dropdown}
                            style={{ color: "white" }}
                        />
                    ),
                    options: {
                        Tests: () => store.mutate({ page: Page.Detail }),
                        Tags: () => store.mutate({ page: Page.Detail }),
                        Steps: () => store.mutate({ page: Page.Detail })
                    }
                }}
            </Menu>
        </>
    )
}
