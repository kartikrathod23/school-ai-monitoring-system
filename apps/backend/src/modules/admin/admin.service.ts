import prisma from "../../database/prisma";
import bcrypt from "bcrypt";
import { generateUserCode } from "../../common/utils/UserCodes";
import { Role } from "@prisma/client";

export const createSchoolService = async (data: {
  name: string;
  address: string;
  district?: string;
  state?: string;
  pinCode?: string;
  contactNumber?: string;
  latitude: number;
  longitude: number;
  geoRadius: number;
}) => {
  return prisma.school.create({ data });
};


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


export const getSectionsByStandardService = async (standardId: string) => {
  return prisma.section.findMany({
    where: { standardId },
    select: {
      id: true,
      name: true,
    },
  });
};

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


export const deleteSchoolService = async (id: string) => {
  const school = await prisma.school.findUnique({
    where: { id },
  });

  if (!school) {
    throw new Error("School not found");
  }

  await prisma.school.delete({
    where: { id },
  });

  return true;
};

export const updateSchoolService = async (
  id: string,
  data: {
    name: string;
    address: string;
    district?: string;
    state?: string;
    pinCode?: string;
    contactNumber?: string;
    latitude: number;
    longitude: number;
    geoRadius: number;
  }
) => {
  const school = await prisma.school.findUnique({
    where: { id },
  });

  if (!school) {
    throw new Error("School not found");
  }

  const updated = await prisma.school.update({
    where: { id },
    data,
  });

  return updated;
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


export const getTeachersService = async (query: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const whereCondition = query.search
    ? {
        user: {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { userCode: { contains: query.search, mode: "insensitive" } },
          ],
        },
      }
    : {};

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where: whereCondition,
      skip,
      take: limit,
      include: {
        user: true,
        sections: {
          include: {
            section: true,
          },
        },
      },
    }),
    prisma.teacher.count({ where: whereCondition }),
  ]);

  return {
    teachers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


export const getTeacherById = async (id: string) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      sections: {
        include: {
          section: true,
        },
      },
    },
  });

  if (!teacher) throw new Error("Teacher not found");

  return teacher;
};


export const updateTeacherService = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    sectionIds?: string[];
  }
) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
  });

  if (!teacher) throw new Error("Teacher not found");

  // Validate sections
  if (data.sectionIds) {
    const sections = await prisma.section.findMany({
      where: { id: { in: data.sectionIds } },
    });

    if (sections.length !== data.sectionIds.length) {
      throw new Error("Invalid section(s)");
    }
  }

  //Update
  const updated = await prisma.teacher.update({
    where: { id },
    data: {
      user: {
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      },
      sections: data.sectionIds
        ? {
            deleteMany: {}, // remove old
            create: data.sectionIds.map((sectionId) => ({
              sectionId,
            })),
          }
        : undefined,
    },
    include: {
      user: true,
      sections: true,
    },
  });

  return updated;
};


export const deleteTeacherService = async (id: string) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
  });

  if (!teacher) throw new Error("Teacher not found");

  await prisma.teacher.delete({
    where: { id },
  });

  return true;
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


export const getStudentsService = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  sectionId?: string;
  faceStatus?: string;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const whereCondition: any = {};

  if (query.sectionId) {
    whereCondition.sectionId = query.sectionId;
  }

  if (query.faceStatus) {
    whereCondition.faceStatus = query.faceStatus;
  }

  if (query.search) {
    whereCondition.user = {
      OR: [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { userCode: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where: whereCondition,
      skip,
      take: limit,
      include: {
        user: true,
        section: true,
      },
    }),
    prisma.student.count({ where: whereCondition }),
  ]);

  return {
    students,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


export const getStudentById = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      section: true,
    },
  });

  if (!student) throw new Error("Student not found");

  return student;
};


export const updateStudentService = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    sectionId?: string;
    rollNumber?: number;
    faceStatus?: "NOT_ADDED" | "ADDED" | "RESCAN";
  }
) => {

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!student) throw new Error("Student not found");

  if (data.sectionId) {
    const section = await prisma.section.findUnique({
      where: { id: data.sectionId },
    });
    if (!section) throw new Error("Section not found");
  }

  if (data.rollNumber) {
    const existing = await prisma.student.findFirst({
      where: {
        sectionId: data.sectionId || student.sectionId,
        rollNumber: data.rollNumber,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("Roll number already exists in this section");
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      sectionId: data.sectionId,
      rollNumber: data.rollNumber,
      faceStatus: data.faceStatus,
      user: {
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      },
    },
    include: {
      user: true,
      section: true,
    },
  });

  return updated;
};


export const deleteStudentService = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) throw new Error("Student not found");

  await prisma.student.delete({
    where: { id },
  });

  return true;
};


export const getAllSchoolsService = async () => {
  return prisma.school.findMany({
    select: {
      id: true,
      name: true,
    },
  });
};


export const getDashboardStatsService = async () => {
  const [students, teachers, schools] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.school.count(),
  ]);

  return {
    totalStudents: students,
    totalTeachers: teachers,
    totalSchools: schools,
  };
};


// update face status
export const updateFaceStatusService = async (
  studentId: string,
  faceStatus: "NOT_ADDED" | "ADDED" | "RESCAN"
) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) throw new Error("Student not found");

  return prisma.student.update({
    where: { id: studentId },
    data: { faceStatus },
  });
};


