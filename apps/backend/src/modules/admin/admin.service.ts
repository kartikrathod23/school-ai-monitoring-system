import prisma from "../../database/prisma";

export const createSchoolService = async(data:{name: string;
  address: string;
  latitude: number;
  longitude: number;
  geoRadius: number;
})=>{
    const school = await prisma.school.create({data});
    return school;
}


export const createStandardService= async(data: {name:string; schoolId:string;})=>{
    const school = await prisma.school.findUnique({
        where:{
            id:data.schoolId
        }
    });

    if(!school){
        throw new Error("School Not Found");
    }

    const standard = await prisma.standard.create({
        data:{
            name:data.name,
            schoolId: data.schoolId,
        },
    });

    return standard;
}

export const createSectionService = async (data: {
  name: string;
  standardId: string;
}) => {
  const standard = await prisma.standard.findUnique({
    where: { id: data.standardId },
  });

  if (!standard) {
    throw new Error("Standard not found");
  }

  const section = await prisma.section.create({
    data: {
      name: data.name,
      standardId: data.standardId,
    },
  });

  return section;
};


export const getSchoolsService = async () => {
  const schools = await prisma.school.findMany({
    include: {
      standards: {
        include: {
          sections: true,
        },
      },
    },
  });

  return schools;
};


export const getStandardsBySchool = async (schoolId: string) => {
  const standards = await prisma.standard.findMany({
    where: { schoolId },
    include: {
      sections: true,
    },
  });

  return standards;
};