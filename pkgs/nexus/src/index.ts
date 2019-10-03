import { GraphQLServer } from 'graphql-yoga'
import { Photon } from '@generated/photon'
import schema from './schema'

const photon = new Photon()
const server = new GraphQLServer({
  schema,
  context: () => ({ photon }),
})

server.start(() => console.log(`🚀 Server ready at http://localhost:4000`))
