import { Request,Response } from "express";
import { createSchoolService, createStandardService,createSectionService,getSchoolsService, getStandardsBySchool} from "./admin.service";

export const createSchool = async (req:Request, res:Response)=>{
    try{
        const {name, address, latitude, longitude, geoRadius} = req.body;
        const school = await createSchoolService({
            name,
            address,
            latitude,
            longitude,
            geoRadius
        });

        return res.json(school);
    }
    catch(error:any){
        res.status(400).json({message: error.message});
    }

}

export const createStandard = async(req:Request,res:Response)=>{
    try{
        const standard = await createStandardService(req.body);

        return res.status(201).json({
            success:true,
            message:"Standard created successfully!",
            data:standard
        });
    }
    catch(err:any){
        return res.status(400).json({
            success:false,
            message:err.message,
            data:null
        })
    }
}


export const createSection = async (req: Request, res: Response) => {
  try {
    const section = await createSectionService(req.body);

    return res.status(201).json({
      success: true,
      message: "Section created successfully",
      data: section,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};


export const getSchools = async (req: Request, res: Response) => {
  try {
    const schools = await getSchoolsService();

    return res.status(200).json({
      success: true,
      message: "Schools fetched successfully",
      data: schools,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};



export const getStandards = async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId as string;

    const standards = await getStandardsBySchool(schoolId);

    return res.status(200).json({
      success: true,
      message: "Standards fetched successfully",
      data: standards,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};