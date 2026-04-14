import { CheckCircle, Clock, AlertCircle } from "lucide-react";

const icons: any = {
  green: CheckCircle,
  yellow: Clock,
  red: AlertCircle,
};

export default function StatusCard({ title, value, color }: any) {
  const Icon = icons[color];

  const styles: any = {
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`p-5 rounded-xl shadow-sm flex items-center gap-4 ${styles[color]}`}>
      
      <Icon size={26} />

      <div>
        <h2 className="text-xl font-semibold">{value}</h2>
        <p className="text-base">{title}</p>
      </div>
    </div>
  );
}