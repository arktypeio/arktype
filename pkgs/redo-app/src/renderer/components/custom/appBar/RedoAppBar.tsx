import React from "react"
import { Row } from "redo-components"
import { AppBar } from "redo-components"
import { SearchBar } from "./SearchBar"
import { HomeButton } from "./HomeButton"
import { NewTestButton } from "./NewTestButton"
import { AccountSection } from "./AccountSection"
import {CloseLearnerButton} from "./CloseLearnerButton"
import { ScheduleButton } from "./ScheduleButton"

const leftItems = {
    home: <HomeButton />,
    newTest: <NewTestButton />,
    close: <CloseLearnerButton/>
}
type LeftKey = keyof typeof leftItems
const centerItems = {
    search: <SearchBar />
}
type CenterKey = keyof typeof centerItems

const rightItems = {
    account: <AccountSection />
}
type RightKey = keyof typeof rightItems

export type RedoAppBarProps = { children: ItemKey[] }
export type ItemKey = LeftKey | CenterKey | RightKey

export const RedoAppBar = ({ children }: RedoAppBarProps) => (
    <AppBar>
        {[leftItems, centerItems, rightItems].map(group => (
            <div>
                <Row>
                    {children
                        .filter(key => key in group)
                        .map(key => (group as any)[key])}
                </Row>
            </div>
        ))}
    </AppBar>
)
