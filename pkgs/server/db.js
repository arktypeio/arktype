const Sequelize = require("sequelize")
const NoteModel = require("./models/Note")
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        dialect: "mysql",
        host: process.env.DB_HOST,
        port: process.env.DB_PORT
    }
)
const Note = NoteModel(sequelize, Sequelize)
const Models = { Note }
const connection = {}

module.exports = async () => {
    if (connection.isConnected) {
        console.log("=> Using existing connection.")
        return Models
    }

    await sequelize.sync()
    await sequelize.authenticate()
    connection.isConnected = true
    console.log("=> Created a new connection.")
    return Models
}
