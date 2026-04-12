import prisma from "../../database/prisma";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export const loginUser=async(identifier:string, password:string)=>{

    console.log("Before DB query");


    const user = await prisma.user.findFirst({
        where:{
            OR:[
                {userCode:identifier},
                {mobileNumber:identifier}
            ]
        }
    });

    if(!user){
        throw new Error("User not found");
    }

    console.log("After DB query");

    console.log("Before bcrypt");


    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if(!isMatch){
        throw new Error("Invalid Password");
    }

    console.log("After bcrypt");

    const token = jwt.sign(
        {
        userId: user.id,
        role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return{
        token,
        user:{
            id:user.id,
            userCode: user.userCode,
            role: user.role
        }
    }
}


export const getMeService = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userCode: true,
      role: true,
      firstName: true,
      lastName: true,
      mobileNumber: true,
    },
  });
};