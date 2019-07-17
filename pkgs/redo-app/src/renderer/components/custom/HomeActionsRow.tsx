import React from "react"
import { Theme } from "@material-ui/core"
import { component } from "blocks"
import { AddButton, ScheduleButton, AccountButton, HelpButton } from "custom"
import { Row, Menu } from "blocks"
import { SearchInput } from "./SearchInput"

const styles = (theme: Theme) => ({
    homeActionsRow: {
        height: theme.spacing(10)
    },
    searchInput: {
        width: theme.spacing(40)
    }
})

export const HomeActionsRow = component({
    name: "HomeActionsRow",
    styles,
    store: true
})(({ classes, store }) => {
    return (
        <>
            <Row justify="center" className={classes.homeActionsRow}>
                <AddButton
                    onClick={() =>
                        store.mutate({
                            learner: { active: true }
                        })
                    }
                />
                <ScheduleButton />
                <SearchInput placeholder="Search your tests" />
                <HelpButton />
                <Menu
                    Button={AccountButton}
                    options={{ Logout: () => store.mutate({ token: "" }) }}
                />
            </Row>
        </>
    )
})
