import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from './modules/admin/admin.routes';

dotenv.config();

const app=express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use('/api/admin',adminRoutes);


app.get('/',(req,res)=>{
    res.send("API is Running! ");
})

const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
})
