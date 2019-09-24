import React, { FC } from "react"
import { TextInput, TextInputProps } from "@re-do/components"
import { store } from "renderer/common"

export type SearchInputProps = Omit<TextInputProps, "variant">

const onChange = async (event: React.ChangeEvent<HTMLInputElement>) =>
    store.mutate({
        cardFilter: event.target.value
    })

export const SearchInput: FC<SearchInputProps> = ({ ...rest }) => (
    <TextInput
        kind="underlined"
        colorTemplate="light"
        {...{ onChange, ...rest }}
    />
)
