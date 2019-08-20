import React from "react"
import { component } from "blocks"
import { AddButton, ScheduleButton, AccountButton, HelpButton } from "custom"
import { Menu, Button, useTheme } from "redo-components"
import { SearchInput } from "./SearchInput"
import { Page } from "renderer/state"
import { AppBar } from "redo-components"
import { IconButton } from "./Buttons"
import {
    Person,
    HelpOutline,
    Schedule,
    Add,
    MoreVert
} from "@material-ui/icons"

export const HomeActionsRow = component({
    name: "HomeActionsRow",
    store: true
})(({ store }) => {
    const theme = useTheme()
    return (
        <AppBar>
            <div>
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
            </div>

            <div>
                <SearchInput
                    style={{
                        width: theme.spacing(40)
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
            </div>
            <div>
                <IconButton Icon={HelpOutline} style={{ color: "white" }} />

                <Menu>
                    {{
                        toggle: (
                            <IconButton
                                Icon={Person}
                                style={{ color: "white" }}
                            />
                        ),
                        options: { Logout: () => store.mutate({ token: "" }) }
                    }}
                </Menu>
            </div>
        </AppBar>
    )
})
