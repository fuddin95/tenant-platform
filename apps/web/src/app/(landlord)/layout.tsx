import Sidebar from '@/components/layout/Sidebar';

const LandlordLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    {children}
  </div>
);

export default LandlordLayout;
