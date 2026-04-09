import { Request, Response } from "express";
import { loginUser } from "./auth.service";

export const login = async(req:Request, res:Response)=>{
    console.log("Login API hit");
    try{
        const {identifier, password} = req.body;

        if(!identifier || !password){
            return res.status(400).json({
                 message: "Identifier and password required",
            });
        }

        const result = await loginUser(identifier,password);

        return res.json(result);
    }
    catch(error:any){
        return res.status(400).json({
            message:error.message,
        });
    }
}