import React, { FC } from "react"
import { TextInput } from "../inputs"

export type AppBarProps = {
    includeSearch?: boolean
}

export const AppBar: FC<AppBarProps> = ({ includeSearch }) => {
    return (
        <div>
            {includeSearch ? <TextInput kind="underlined" /> : null}This is an
            app bar!
        </div>
    )
}
