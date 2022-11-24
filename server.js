import app from './app.js'
import mongoose from 'mongoose'
import dotenv from "dotenv"
dotenv.config({path: './config.env'})

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
  

const port = process.env.PORT || 4000

//mongodb connection string
const db = process.env.MONGODB_LOCAL

mongoose.connect(db).then(() => {
    console.log("Connected to MongoDB")
})

//server listen
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...')
    console.log(err.name, err.message)
    server.close(() => {
      process.exit(1)
    });
})

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully')
    server.close(() => {
      console.log('💥 Process terminated!')
    })
})