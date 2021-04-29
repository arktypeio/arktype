import React, { ComponentType } from "react"
import { Row } from "@re-do/components"
import { FloatBar } from "@re-do/components"
import { SearchBar } from "./SearchBar"
import { HomeButton } from "./HomeButton"
import { NewTestButton } from "./NewTestButton"
import { AccountSection } from "./AccountSection"

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
