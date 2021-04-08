import React from "react"
import { AppBar, AppBarProps } from "."
import { Icons } from "../icons"
import { TextInput, ChipInput } from "../inputs"
import { Text } from "../text"

export default {
    title: "AppBar"
}

export const TopAppBar = (props: AppBarProps) => (
    <div>
        <TestAppBar />
        {content}
    </div>
)

export const BottomAppBar = (props: AppBarProps) => (
    <div>
        {content}
        <TestAppBar kind="bottom" />
    </div>
)

const content = (
    <div>
        {[...Array(50)].map((_, index) => (
            <p>Line {index + 1} of 50</p>
        ))}
    </div>
)

const TestAppBar = (props: AppBarProps) => (
    <AppBar {...props}>
        <Text>Admiral AppBar</Text>
        <TextInput kind="underlined" colorTemplate="light" />
        <ChipInput />
        <Icons.account onClick={() => console.log("clicked")} />
    </AppBar>
)
