import React from "react"
import MuiChipInput, {
    Props as MuiChipInputProps
} from "material-ui-chip-input"

export type ChipInputProps = MuiChipInputProps

export const ChipInput = ({ ...rest }: ChipInputProps) => {
    return <MuiChipInput {...rest} />
}
