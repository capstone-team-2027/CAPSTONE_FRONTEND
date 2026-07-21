import { lazy, Suspense } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";

const Header = lazy(() => import("./pages/customer/Header"));
const Home = lazy(() => import("./pages/customer/Home/Home"));
const Services = lazy(() => import("./pages/customer/services/Services"));
const Parts = lazy(() => import("./pages/customer/Parts/Parts"));
const BookingPage = lazy(() => import("./pages/customer/Booking/BookingPage"));
const Signup = lazy(() => import("./pages/customer/Home/SingUp"));
const Footer = lazy(() => import("./pages/customer/Footer"));
const Login = lazy(() => import("./pages/customer/Home/Login"));
const UserProfile = lazy(() => import("./pages/customer/UserProfile/UserProfile"));
const ForgotPassword = lazy(() => import("./pages/customer/Home/ForgotPassword"));
const Team = lazy(() => import("./pages/customer/Team/Team"));
const OtpVerification = lazy(() => import("./pages/customer/Home/verify-otp"));
const VerifyPhone = lazy(() => import("./pages/customer/Home/verify-phone"));

const VideoCallRoom = lazy(() => import("./pages/common/VideoCallRoom"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminSettings = lazy(() => import("./pages/admin/settings/AdminSettings"));
const AdminServicesCategories = lazy(() => import("./pages/admin/services/AdminServicesCategories"));
const AdminResources = lazy(() => import("./pages/admin/resources/AdminResources"));
const AdminServiceCatalog = lazy(() => import("./pages/admin/services/AdminServiceCatalog"));
const AdminStaffManagement = lazy(() => import("./pages/admin/staff/AdminStaffManagement"));
const AdminShiftManagement = lazy(() => import("./pages/admin/staff/AdminShiftManagement"));
const AdminWarrantyPolicies = lazy(() => import("./pages/admin/warranty/AdminWarrantyPolicies"));
const AdminStatistics = lazy(() => import("./pages/admin/dashboard/AdminStatistics"));
const AdminCustomerManagement = lazy(() => import("./pages/admin/customer/AdminCustomerManagement"));
const AdminCustomerDetailPage = lazy(() => import("./pages/admin/customer/AdminCustomerDetailPage"));
const InventoryLayout = lazy(() => import("./pages/inventory/InventoryLayout"));
const InventoryDashboard = lazy(() => import("./pages/inventory/dashboard/InventoryDashboard"));
const InventoryParts = lazy(() => import("./pages/inventory/parts/InventoryParts"));
const ImportHistory = lazy(() => import("./pages/inventory/import/InventoryImport"));
const PartCategories = lazy(() => import("./pages/inventory/categories/InventoryPartCategories"));
const InventorySuppliers = lazy(() => import("./pages/inventory/suppliers/InventorySuppliers"));
const InventoryApprovedQuotes = lazy(() => import("./pages/inventory/export/InventoryApprovedQuotes"));
const InventoryExport = lazy(() => import("./pages/inventory/export/InventoryExport"));

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
const ReceptionIssueReports =  lazy(() => import("./pages/reception/issues-report/ReceptionIssuesReportHistory"));

// Technician Page Imports
const TechnicianLayout = lazy(() => import("./pages/technician/TechnicianLayout"));
const TechnicianAssignments = lazy(() => import("./pages/technician/assignments/TechnicianAssignments"));
const TechnicianAssignmentsDetail = lazy(() => import("./pages/technician/assignments/TechnicianAssignmentsDetail"));
const TechnicianRequestParts = lazy(() => import("./pages/technician/parts-request/TechnicianRequestParts"));
const TechnicianUpdateProgress = lazy(() => import("./pages/technician/progress/TechnicianUpdateProgress"));
const TechnicianMyShifts = lazy(() => import("./pages/technician/my-shifts/TechnicianMyShifts"));
const TechnicianIssuesReportHistory = lazy(() => import("./pages/technician/assignments/IssuesReportHistory"));

// Technician Leader Page Imports
const LeaderLayout = lazy(() => import("./pages/leader/LeaderLayout"));
const LeaderDashboard = lazy(() => import("./pages/leader/LeaderDashboard"));
const LeaderAssignments = lazy(() => import("./pages/leader/LeaderAssignments"));
const LeaderFinalQc = lazy(() => import("./pages/leader/LeaderFinalQc"));

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
    location.pathname.startsWith("/inventory") ||
    location.pathname.startsWith("/reception") ||
    location.pathname.startsWith("/technician") ||
    location.pathname.startsWith("/leader") ||
    location.pathname.startsWith("/video-call");
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Header />}>
          <Route path="" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="parts" element={<Parts />} />
          <Route path="phone-service" element={<BookingPage />} />
          <Route path="login" element={<Login />} />
          <Route path="oauth-success" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="user-profile" element={<UserProfile />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="team" element={<Team />} />
          <Route path="otp-verification" element={<OtpVerification />} />
          <Route path="verify-phone" element={<VerifyPhone />} />
        </Route>

        <Route path="/video-call/:roomId" element={<VideoCallRoom />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<AdminStatistics />} />
          <Route path="services-category" element={<AdminServicesCategories />} />
          <Route path="resources" element={<AdminResources />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="services" element={<AdminServiceCatalog />} />
          <Route path="staff" element={<AdminStaffManagement />} />
          <Route path="shifts" element={<AdminShiftManagement />} />
          <Route path="warranty" element={<AdminWarrantyPolicies />} />
          <Route path="statistics" element={<AdminStatistics />} />
          <Route path="customers" element={<AdminCustomerManagement />} />
          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
        </Route>
        <Route path="/inventory" element={<InventoryLayout />}>
          <Route path="" element={<InventoryDashboard />} />
          <Route path="parts" element={<InventoryParts />} />
          <Route path="categories" element={<PartCategories />} />
          <Route path="import" element={<ImportHistory />} />
          <Route path="suppliers" element={<InventorySuppliers />} />
          <Route path="approved-quotes" element={<InventoryApprovedQuotes />} />
          <Route path="export" element={<InventoryExport />} />
        </Route>

        <Route path="/technician" element={<TechnicianLayout />}>
          <Route path="" element={<Navigate to="assignments" replace />} />
          <Route path="assignments" element={<TechnicianAssignments />} />
          <Route path="assignments/:id" element={<TechnicianAssignmentsDetail />} />
          <Route path="parts-request" element={<TechnicianRequestParts />} />
          <Route path="parts-request/:id" element={<TechnicianRequestParts />} />
          <Route path="progress" element={<TechnicianUpdateProgress />} />
          <Route path="progress/:id" element={<TechnicianUpdateProgress />} />
          <Route path="my-shifts" element={<TechnicianMyShifts />} />
          <Route path="issues-reports" element={<TechnicianIssuesReportHistory />} />
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
          <Route path="issues" element={<ReceptionIssueReports />} />
        </Route>

        {/* Technician Leader Dashboard */}
        <Route path="/leader" element={<LeaderLayout />}>
          <Route path="" element={<LeaderDashboard />} />
          <Route path="assignments" element={<LeaderAssignments />} />
          <Route path="final-qc" element={<LeaderFinalQc />} />
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
