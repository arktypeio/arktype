import React from "react"
import { Theme } from "@material-ui/core"
import { component, TextInput, TextInputProps } from "blocks"
import { store } from "renderer/common"

const styles = (theme: Theme) => ({})

export type SearchInputProps = Omit<TextInputProps, "variant">

const onChange = async (event: React.ChangeEvent<HTMLInputElement>) =>
    store.mutate({
        cardFilter: event.target.value
    })

export const SearchInput = component({
    name: "SearchInput",
    defaultProps: {} as Partial<SearchInputProps>,
    styles
})(({ classes, ...rest }) => (
    <TextInput variant="underlined" {...{ onChange, ...rest }} />
))
