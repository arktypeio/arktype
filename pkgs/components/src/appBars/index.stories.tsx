import React from "react"
import { storiesOf } from "@storybook/react"
import { AppBar, AppBarProps } from "."
import { Icons } from "../icons"
import { TextInput } from "../inputs"
import { Text } from "../text"

storiesOf("AppBar", module)
    .add("top", () => (
        <div>
            <TestAppBar />
            {content}
        </div>
    ))
    .add("bottom", () => (
        <div>
            {content}
            <TestAppBar kind="bottom" />
        </div>
    ))
    .add("top and bottom", () => (
        <div>
            <TestAppBar />
            {content}
            <TestAppBar kind="bottom" />
        </div>
    ))

const content = (
    <div>
        {[...Array(100)].map((_, index) => (
            <p>Line {index + 1}</p>
        ))}
    </div>
)

const TestAppBar = (props: AppBarProps) => (
    <AppBar {...props}>
        <Text>Admiral AppBar</Text>
        <TextInput kind="underlined" colorTemplate="light" />
        <Icons.account onClick={() => console.log("clicked")} />
    </AppBar>
)
