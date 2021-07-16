import React, { ComponentType } from "react"
import { Row, FloatBar } from "@re-do/components"
import { SearchBar } from "./SearchBar.js"
import { HomeButton } from "./HomeButton.js"
import { NewTestButton } from "./NewTestButton.js"
import { AccountSection } from "./AccountSection.js"

const leftItems = {
    home: HomeButton,
    newTest: NewTestButton
}
type LeftKey = keyof typeof leftItems
const centerItems = {
    search: SearchBar
}
type CenterKey = keyof typeof centerItems

const rightItems = {
    account: AccountSection
}
type RightKey = keyof typeof rightItems

export type RedoAppBarProps = { children: ItemKey[] }
export type ItemKey = LeftKey | CenterKey | RightKey

export const RedoAppBar = ({ children }: RedoAppBarProps) => (
    <FloatBar>
        {[leftItems, centerItems, rightItems].map((group, index) => (
            <div key={index}>
                <Row>
                    {children
                        .filter((key) => key in group)
                        .map((key) => {
                            const Group: ComponentType = (group as any)[key]
                            return <Group key={key} />
                        })}
                </Row>
            </div>
        ))}
    </FloatBar>
)
