import prisma from "../../database/prisma";
import bcrypt from "bcrypt";
import { generateUserCode } from "../../common/utils/UserCodes";
import { Role } from "@prisma/client";

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


// teacher section

export const createTeacherService = async (data: {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  password: string;
  sectionIds: string[];
}) => {

  const existingUser = await prisma.user.findUnique({
    where: { mobileNumber: data.mobileNumber },
  });

  if (existingUser) {
    throw new Error("User with this mobile number already exists");
  }

  const sections = await prisma.section.findMany({
    where: {
      id: { in: data.sectionIds },
    },
  });

  if (sections.length !== data.sectionIds.length) {
    throw new Error("One or more sections are invalid");
  }

  const count = await prisma.user.count({
    where: { role: "TEACHER" },
  });

  const userCode = generateUserCode("TEACHER", count);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const teacher = await prisma.teacher.create({
    data: {
      user: {
        create: {
          userCode,
          role: "TEACHER",
          firstName: data.firstName,
          lastName: data.lastName,
          mobileNumber: data.mobileNumber,
          passwordHash: hashedPassword,
          status: "ACTIVE",
        },
      },
      sections: {
        create: data.sectionIds.map((sectionId) => ({
          sectionId,
        })),
      },
    },
    include: {
      user: true,
      sections: true,
    },
  });

  return teacher;
};

// studetn handling
export const createStudentService = async (data: {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  password: string;
  sectionId: string;
  rollNumber: number;
}) => {

  const section = await prisma.section.findUnique({
    where: { id: data.sectionId },
  });

  if (!section) {
    throw new Error("Section not found");
  }

  const existingStudent = await prisma.student.findFirst({
    where: {
      sectionId: data.sectionId,
      rollNumber: data.rollNumber,
    },
  });

  if (existingStudent) {
    throw new Error("Roll number already exists in this section");
  }

  const count = await prisma.user.count({
    where: { role: "STUDENT" },
  });

  const userCode = generateUserCode("STUDENT", count);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const student = await prisma.student.create({
    data: {
      user: {
        create: {
          userCode,
          role: "STUDENT",
          firstName: data.firstName,
          lastName: data.lastName,
          mobileNumber: data.mobileNumber,
          passwordHash: hashedPassword,
          status: "ACTIVE",
        },
      },
      section:{
        connect:{
          id: data.sectionId
        }
      },
      rollNumber: data.rollNumber,
    },
    include: {
      user: true,
      section: true,
    },
  });

  return student;
};