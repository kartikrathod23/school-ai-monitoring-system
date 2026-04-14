export default function Header() {
  return (
    <div className="h-16 bg-white border-b-2 border-b-gray-200 shadow-2xl flex items-center justify-between px-6 py-[2.2rem]">
      
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Phase 1: Onboarding & Registration
        </p>
      </div>

      <img
        src="/logos/uit.jpg"
        alt="UIT"
        className="h-8"
      />
    </div>
  );
}