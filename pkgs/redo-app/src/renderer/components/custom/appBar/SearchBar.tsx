import React, { FC } from "react"
import { Menu } from "redo-components"
import { IconButton } from "redo-components"
import { SearchInput } from "../SearchInput"
import { MoreVert } from "@material-ui/icons"
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
                            Icon={MoreVert}
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
