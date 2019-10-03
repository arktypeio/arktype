import Photon from '@generated/photon'
import { name } from 'faker'

main()

async function main() {
  const photon = new Photon()
  const author = await photon.authors.create({
    data: {
      name: name.firstName(),
      blog: {},
      rating: 0.5,
    },
  })
  console.log('added author:\n', author)
  await photon.disconnect()
}
