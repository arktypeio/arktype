import React from "react"
import { component } from "blocks"
import { AddButton, ScheduleButton, AccountButton, HelpButton } from "custom"
import { Row, Menu, Button, useTheme } from "redo-components"
import { SearchInput } from "./SearchInput"
import { Page } from "renderer/state"

export const HomeActionsRow = component({
    name: "HomeActionsRow",
    store: true
})(({ store }) => {
    const theme = useTheme()
    return (
        <>
            <Row
                justify="center"
                style={{
                    height: theme.spacing(10)
                }}
            >
                <Button
                    kind="secondary"
                    onClick={() => store.mutate({ page: Page.TestView })}
                >
                    See all tests
                </Button>
                <Button
                    kind="secondary"
                    onClick={() => store.mutate({ page: Page.TagView })}
                >
                    See all tags
                </Button>
                <AddButton
                    onClick={() =>
                        store.mutate({
                            learner: { active: true }
                        })
                    }
                />
                <ScheduleButton />
                <SearchInput
                    style={{
                        width: theme.spacing(40)
                    }}
                    placeholder="Search your tests"
                />
                <HelpButton />
                <Menu>
                    {{
                        toggle: <AccountButton />,
                        options: { Logout: () => store.mutate({ token: "" }) }
                    }}
                </Menu>
            </Row>
        </>
    )
})
