import { lazy, Suspense } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";

const Header = lazy(() => import("./pages/customer/Header"));
const Home = lazy(() => import("./pages/customer/home/Home"));
const Services = lazy(() => import("./pages/customer/services/Services"));
const Parts = lazy(() => import("./pages/customer/parts/Parts"));
const BookingPage = lazy(() => import("./pages/customer/booking/BookingPage"));
const Signup = lazy(() => import("./pages/customer/home/SingUp"));
const Footer = lazy(() => import("./pages/customer/Footer"));
const Login = lazy(() => import("./pages/customer/home/Login"));
const UserProfile = lazy(() => import("./pages/customer/UserProfile/UserProfile"));
const ForgotPassword = lazy(() => import("./pages/customer/home/ForgotPassword"));
const Team = lazy(() => import("./pages/customer/team/Team"));
const OtpVerification = lazy(() => import("./pages/customer/home/verify-otp"));
const VerifyPhone = lazy(() => import("./pages/customer/home/verify-phone"));


const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminSettings = lazy(() => import("./pages/admin/settings/AdminSettings"));
const AdminServicesCategories = lazy(() => import("./pages/admin/services/AdminServicesCategories"));
const AdminResources = lazy(() => import("./pages/admin/resources/AdminResources"));
const AdminServiceCatalog = lazy(() => import("./pages/admin/services/AdminServiceCatalog"));
const AdminStaffManagement = lazy(() => import("./pages/admin/staff/AdminStaffManagement"));
const AdminWarrantyPolicies = lazy(() => import("./pages/admin/warranty/AdminWarrantyPolicies"));
const AdminStatistics = lazy(() => import("./pages/admin/dashboard/AdminStatistics"));
const AdminCustomerManagement = lazy(() => import("./pages/admin/customer/AdminCustomerManagement"));
const InventoryLayout = lazy(() => import("./pages/inventory/InventoryLayout"));
const InventoryDashboard = lazy(() => import("./pages/inventory/dashboard/InventoryDashboard"));
const InventoryParts = lazy(() => import("./pages/inventory/parts/InventoryParts"));
const ImportHistory = lazy(() => import("./pages/inventory/import/InventoryImportHistory"));
const PartCategories = lazy(() => import("./pages/inventory/categories/InventoryPartCategories"));

// Reception Page Imports
const ReceptionLayout = lazy(() => import("./pages/reception/ReceptionLayout"));
const ReceptionAppointmentList = lazy(() => import("./pages/reception/appointments/ReceptionAppointmentList"));
const ReceptionAppointmentDetail = lazy(() => import("./pages/reception/appointments/ReceptionAppointmentDetail"));
const ReceptionServiceOrderList = lazy(() => import("./pages/reception/service-orders/ReceptionServiceOrderList"));
const ReceptionServiceOrderDetail = lazy(() => import("./pages/reception/service-orders/ReceptionServiceOrderDetail"));
const ReceptionCreateServiceOrder = lazy(() => import("./pages/reception/service-orders/ReceptionCreateServiceOrder"));
const ReceptionReceiveFeedback = lazy(() => import("./pages/reception/feedback/ReceptionReceiveFeedback"));
const ReceptionServiceHistory = lazy(() => import("./pages/reception/service-history/ReceptionServiceHistory"));
const ReceptionProcessPayment = lazy(() => import("./pages/reception/payments/ReceptionProcessPayment"));
const ReceptionQuoteList = lazy(() => import("./pages/reception/quotes/ReceptionQuoteList"));
const ReceptionQuoteDetail = lazy(() => import("./pages/reception/quotes/ReceptionQuoteDetail"));

// Technician Page Imports
const TechnicianLayout = lazy(() => import("./pages/technician/TechnicianLayout"));
const TechnicianServiceOrderList = lazy(() => import("./pages/technician/service-orders/TechnicianServiceOrderList"));
const TechnicianServiceOrderDetail = lazy(() => import("./pages/technician/service-orders/TechnicianServiceOrderDetail"));
const TechnicianAssignments = lazy(() => import("./pages/technician/assignments/TechnicianAssignments"));
const TechnicianRequestParts = lazy(() => import("./pages/technician/parts-request/TechnicianRequestParts"));
const TechnicianUpdateProgress = lazy(() => import("./pages/technician/progress/TechnicianUpdateProgress"));
const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-50/50 backdrop-blur-xs flex flex-col items-center justify-center z-50">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-[#00285E]/10 border-t-[#00285E] animate-spin"></div>
      <div className="absolute inset-3 rounded-full bg-[#F9A11B]/80 animate-pulse"></div>
    </div>
    <span className="mt-4 text-xs font-bold text-[#00285E] tracking-widest uppercase animate-pulse">
      Đang tải hệ thống...
    </span>
  </div>
);

function App() {
  const location = useLocation();
  const isAdminPath =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/inventory");
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Header />}>
          <Route path="" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="parts" element={<Parts />} />
          <Route path="phone-service" element={<BookingPage />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="user-profile" element={<UserProfile />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="team" element={<Team />} />
          <Route path="otp-verification" element={<OtpVerification />} />
          <Route path="verify-phone" element={<VerifyPhone />} />
        </Route>

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<AdminStatistics />} />
          <Route path="services-category" element={<AdminServicesCategories />} />
          <Route path="resources" element={<AdminResources />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="services" element={<AdminServiceCatalog />} />
          <Route path="staff" element={<AdminStaffManagement />} />
          <Route path="warranty" element={<AdminWarrantyPolicies />} />
          <Route path="statistics" element={<AdminStatistics />} />
          <Route path="customers" element={<AdminCustomerManagement />} />
        </Route>
        <Route path="/inventory" element={<InventoryLayout />}>
          <Route path="" element={<InventoryDashboard />} />
          <Route path="parts" element={<InventoryParts />} />
          <Route path="categories" element={<PartCategories />} />
          <Route path="import" element={<ImportHistory />} />
        </Route>

        <Route path="/technician" element={<TechnicianLayout />}>
          <Route path="" element={<Navigate to="service-orders" replace />} />
          <Route path="service-orders" element={<TechnicianServiceOrderList />} />
          <Route path="service-orders/:id" element={<TechnicianServiceOrderDetail />} />
          <Route path="assignments" element={<TechnicianAssignments />} />
          <Route path="parts-request" element={<TechnicianRequestParts />} />
          <Route path="parts-request/:id" element={<TechnicianRequestParts />} />
          <Route path="progress" element={<TechnicianUpdateProgress />} />
          <Route path="progress/:id" element={<TechnicianUpdateProgress />} />
        </Route>

        {/* Reception Dashboard */}
        <Route path="/reception" element={<ReceptionLayout />}>
          <Route path="" element={<Navigate to="appointments" replace />} />
          <Route path="appointments" element={<ReceptionAppointmentList />} />
          <Route path="appointments/:id" element={<ReceptionAppointmentDetail />} />
          <Route path="service-orders" element={<ReceptionServiceOrderList />} />
          <Route path="service-orders/:id" element={<ReceptionServiceOrderDetail />} />
          <Route path="service-orders/create" element={<ReceptionCreateServiceOrder />} />
          <Route path="feedback" element={<ReceptionReceiveFeedback />} />
          <Route path="service-history" element={<ReceptionServiceHistory />} />
          <Route path="payments" element={<ReceptionProcessPayment />} />
          <Route path="quotes" element={<ReceptionQuoteList />} />
          <Route path="quotes/:id" element={<ReceptionQuoteDetail />} />
        </Route>
      </Routes>
      {!isAdminPath && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
    </Suspense>
  );
}
export default App;
