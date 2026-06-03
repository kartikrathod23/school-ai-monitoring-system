import { Request,Response,NextFunction } from "express";

export const errorHandler=(
    err:any,
    req:Request,
    res:Response,
    next:NextFunction
) =>{
    console.log(err);

    if (err.name === "ZodError") {

        return res.status(400).json({
        message: err.errors[0].message,
        });
    }

    return res.status(500).json({
        success:false,
        message: err?.message || err?.errors?.[0]?.message || "Internal Server Error",
        data:null,
    })
}