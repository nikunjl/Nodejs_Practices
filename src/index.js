import mongoose from "mongoose";
import { DB_NAME } from './constants.js';
import connectDB from './db/index.js'
import dotenv from "dotenv"
import { app } from './app.js'

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running :${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("mongo connect", err);
    })
// import express from "express";
// const app = express()
//     (async () => {
//         try {
//             await mongoose.connect(`${process.env.MONGODBURL}/${DB_NAME}`)
//             app.on("error", (error) => {
//                 console.log("error", error);
//                 throw error;
//             })
//             app.listen(process.env.PORT, () => {
//                 console.log(`application is running on ${process.env.PORT}`);
//             });
//         } catch (error) {
//             console.error("Errpr", error);
//             throw error;
//         }
//     })