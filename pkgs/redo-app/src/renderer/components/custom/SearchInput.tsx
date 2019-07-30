import React from "react"
import { Theme } from "@material-ui/core"
import { TextInput, TextInputProps } from "redo-components"
import { component } from "blocks"
import { store } from "renderer/common"

export type SearchInputProps = Omit<TextInputProps, "variant">

const onChange = async (event: React.ChangeEvent<HTMLInputElement>) =>
    store.mutate({
        cardFilter: event.target.value
    })

export const SearchInput = ({ ...rest }) => (
    <TextInput variant="underlined" {...{ onChange, ...rest }} />
)
