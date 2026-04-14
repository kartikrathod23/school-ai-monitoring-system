export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">

      <div className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-end px-6 flex-shrink-0">
        <img src="/logos/uit.jpg" className="h-8" />
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto">
        {children}
      </div>

      <div className="h-12 bg-white border-t border-gray-200 shadow-sm flex items-center justify-center gap-2 text-sm text-gray-500 flex-shrink-0">
        <span>Powered by</span>
        <img src="/logos/iiitv.png" className="h-5" />
        <span>IIIT Vadodara</span>
      </div>
    </div>
  );
}