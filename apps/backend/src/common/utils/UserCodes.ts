export const generateUserCode = (role:string,count:number)=>{
    const prefix =
    role === "ADMIN"
      ? "ADM"
      : role === "TEACHER"
      ? "TCH"
      : role === "STUDENT"
      ? "STU"
      : "USR";

  return `${prefix}_${String(count + 1).padStart(3, "0")}`;
}