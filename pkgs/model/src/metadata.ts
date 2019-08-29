import { stepMetadata, testMetadata, tagMetadata } from "."

export const metadata = {
    test: testMetadata,
    step: stepMetadata,
    tag: tagMetadata
}

export type Metadata = typeof metadata
export type MetadataKey = keyof Metadata
