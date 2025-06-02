import mongoose from "mongoose";
import { DB_NAME } from '../constants.js';


const connectDB = async () => {
    try {
        const connectins = await mongoose.connect(`${process.env.MONGODBURL}/${DB_NAME}`)
        console.log(connectins.connection.host);
    } catch (error) {
        console.log("MONGOOES Not connect");
        process.exit(1)
    }
}

export default connectDB;