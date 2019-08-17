import { testMetadata } from "."

export const metadata = {
    test: testMetadata
}

export type Metadata = typeof metadata
export type MetadataKey = keyof Metadata
