import React, { FC } from "react"
import { Row, Menu } from "redo-components"
import { IconButton } from "../Buttons"
import { SearchInput } from "../SearchInput"
import { MoreVert } from "@material-ui/icons"
import { Page } from "renderer/state"
import { store } from "renderer/common"

export const SearchBar: FC = ({}) => {
    return (
        <div>
            <Row>
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
                            Tests: () => store.mutate({ page: Page.TestView }),
                            Tags: () => store.mutate({ page: Page.TagView })
                        }
                    }}
                </Menu>
            </Row>
        </div>
    )
}
