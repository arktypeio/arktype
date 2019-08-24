import React from "react"
import { component } from "blocks"
import { AddButton, ScheduleButton, AccountButton, HelpButton } from "custom"
import { Row, Menu, Button, useTheme } from "redo-components"
import { SearchInput } from "../SearchInput"
import { Page } from "renderer/state"
import { AppBar } from "redo-components"
import { IconButton } from "../Buttons"
import {
    Person,
    HelpOutline,
    Schedule,
    Add,
    MoreVert
} from "@material-ui/icons"
import { SearchBar } from "./SearchBar"

export const RedoAppBar = component({
    store: true
})(({ store }) => {
    const theme = useTheme()
    return (
        <AppBar>
            <div>
                <Row>
                    <IconButton
                        Icon={Add}
                        style={{ color: "white" }}
                        onClick={() =>
                            store.mutate({
                                learner: { active: true }
                            })
                        }
                    />
                    <IconButton Icon={Schedule} style={{ color: "white" }} />
                </Row>
            </div>

            <SearchBar />

            <div>
                <Row>
                    <IconButton Icon={HelpOutline} style={{ color: "white" }} />

                    <Menu>
                        {{
                            toggle: (
                                <IconButton
                                    Icon={Person}
                                    style={{ color: "white" }}
                                />
                            ),
                            options: {
                                Logout: () => store.mutate({ token: "" })
                            }
                        }}
                    </Menu>
                </Row>
            </div>
        </AppBar>
    )
})
