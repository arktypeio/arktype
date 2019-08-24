import { testMetadata, tagMetadata } from "."

export const metadata = {
    test: testMetadata,
    tags: tagMetadata
}

export type Metadata = typeof metadata
export type MetadataKey = keyof Metadata
