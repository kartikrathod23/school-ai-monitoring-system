import { School, Layers, Grid3X3, Users, GraduationCap } from "lucide-react";

const iconMap: any = {
  Schools: School,
  Standards: Layers,
  Sections: Grid3X3,
  Teachers: Users,
  Students: GraduationCap,
};

export default function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  const Icon = iconMap[title];

  const styles: any = {
    blue: "border-blue-400 text-blue-500",
    green: "border-green-400 text-green-500",
    yellow: "border-yellow-400 text-yellow-500",
    purple: "border-purple-400 text-purple-500",
    pink: "border-pink-400 text-pink-500",
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm flex justify-between items-center">
      
      <div>
        <p className="text-base text-gray-500">{title}</p>
        <h2 className="text-2xl font-semibold">{value}</h2>
      </div>

      <div className={`p-2 rounded-lg bg-gray-50 ${styles[color]}`}>
        <Icon size={22} />
      </div>
    </div>
  );
}