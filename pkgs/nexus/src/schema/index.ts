import * as Path from 'path'
import * as Nexus from 'nexus'
import * as NexusPrisma from 'nexus-prisma'
import * as Query from './Query'
import * as Mutation from './Mutation'
import * as Blog from './Blog'
import * as Post from './Post'
import * as Author from './Author'

const appTypes = [Query, Mutation, Blog, Post, Author]
const nexusPrismaTypes = NexusPrisma.nexusPrismaPlugin({ types: appTypes })
const allTypes = [appTypes, nexusPrismaTypes]

export default Nexus.makeSchema({
  types: allTypes,
  outputs: {
    typegen: Path.join(
      __dirname,
      '../../node_modules/@types/__nexus-typegen__nexus-core/index.d.ts',
    ),
    schema: Path.join(__dirname, '../schema.graphql'),
  },
  typegenAutoConfig: {
    sources: [
      {
        source: '@generated/photon',
        alias: 'photon',
      },
    ],
  },
})
