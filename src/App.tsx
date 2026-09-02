import { lazy, Suspense } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import InitialRoleRedirect from "./components/share/InitialRoleRedirect";

const Header = lazy(() => import("./pages/customer/Header"));
const Home = lazy(() => import("./pages/customer/Home/Home"));
const Services = lazy(() => import("./pages/customer/services/Services"));
const Parts = lazy(() => import("./pages/customer/Parts/Parts"));
const News = lazy(() => import("./pages/customer/News/News"));
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
const Unauthorized = lazy(() => import("./pages/common/Unauthorized"));
const ProtectedRoute = lazy(() => import("./components/share/ProtectedRoute"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminSettings = lazy(() => import("./pages/admin/settings/AdminSettings"));
const AdminServicesCategories = lazy(() => import("./pages/admin/services/AdminServicesCategories"));
const AdminServiceCatalog = lazy(() => import("./pages/admin/services/AdminServiceCatalog"));
const AdminStaffManagement = lazy(() => import("./pages/admin/staff/AdminStaffManagement"));
const AdminWarrantyPolicies = lazy(() => import("./pages/admin/warranty/AdminWarrantyPolicies"));
const AdminTechnicalDocuments = lazy(() => import("./pages/admin/technical-documents/AdminTechnicalDocuments"));
const AdminStatistics = lazy(() => import("./pages/admin/dashboard/AdminStatistics"));
const AdminAiAnalysis = lazy(() => import("./pages/admin/dashboard/AdminAiAnalysis"));
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
const InventoryWaitingStock = lazy(() => import("./pages/inventory/import/InventoryWaitingStock"));
const InventoryRestockRequests = lazy(() => import("./pages/inventory/import/InventoryRestockRequests"));
const InventoryRestockSuggestions = lazy(() => import("./pages/inventory/restock/InventoryRestockSuggestions"));

// Reception Page Imports
const ReceptionLayout = lazy(() => import("./pages/reception/ReceptionLayout"));
const ReceptionAppointmentList = lazy(() => import("./pages/reception/appointments/ReceptionAppointmentList"));
const ReceptionAppointmentDetail = lazy(() => import("./pages/reception/appointments/ReceptionAppointmentDetail"));
const ReceptionCreateAppointment = lazy(() => import("./pages/reception/appointments/ReceptionCreateAppointment"));
const ReceptionServiceOrderList = lazy(() => import("./pages/reception/service-orders/ReceptionServiceOrderList"));
const ReceptionServiceOrderDetail = lazy(() => import("./pages/reception/service-orders/ReceptionServiceOrderDetail"));
const ReceptionCreateServiceOrder = lazy(() => import("./pages/reception/service-orders/ReceptionCreateServiceOrder"));
const ReceptionServiceHistory = lazy(() => import("./pages/reception/service-history/ReceptionServiceHistory"));
const ReceptionProcessPayment = lazy(() => import("./pages/reception/payments/ReceptionProcessPayment"));
const ReceptionQuoteList = lazy(() => import("./pages/reception/quotes/ReceptionQuoteList"));
const ReceptionCustomerList = lazy(() => import("./pages/reception/customers/ReceptionCustomerList"));
const ReceptionReceiveCustomer = lazy(() => import("./pages/reception/customers/ReceptionReceiveCustomer"));
const ReceptionRescueCreateServiceOrder = lazy(() => import("./pages/reception/customers/ReceptionRescueCreateServiceOrder"));
const ReceptionTechnicianList = lazy(() => import("./pages/reception/technicians/ReceptionTechnicianList"));


// Technician Page Imports
const TechnicianLayout = lazy(() => import("./pages/technician/TechnicianLayout"));
const TechnicianOverview = lazy(() => import("./pages/technician/overview/TechnicianOverview"));
const TechnicianAssignments = lazy(() => import("./pages/technician/assignments/TechnicianAssignments"));
const TechnicianAssignmentsDetail = lazy(() => import("./pages/technician/assignments/TechnicianAssignmentsDetail"));
const TechnicianWorkHistory = lazy(() => import("./pages/technician/work-history/TechnicianWorkHistory"));
const TechnicianAddRepairNote = lazy(() => import("./pages/technician/repair-notes/TechnicianAddRepairNote"));
const TechnicianUpdateProgress = lazy(() => import("./pages/technician/progress/TechnicianUpdateProgress"));
const TechnicianMyShifts = lazy(() => import("./pages/technician/my-shifts/TechnicianMyShifts"));
const TechnicianIssuesReportHistory = lazy(() => import("./pages/technician/assignments/IssuesReportHistory"));
const TechnicianRescuePage = lazy(() => import("./pages/technician/rescue/TechnicianRescuePage"));

// Technician Leader Page Imports
const LeaderLayout = lazy(() => import("./pages/leader/LeaderLayout"));
const LeaderDashboard = lazy(() => import("./pages/leader/LeaderDashboard"));
const LeaderAppointmentList = lazy(() => import("./pages/leader/LeaderAppointmentList"));
const LeaderAssignments = lazy(() => import("./pages/leader/LeaderAssignments"));
const LeaderTaskTracking = lazy(() => import("./pages/leader/LeaderTaskTracking"));
const LeaderCreateServiceOrder = lazy(() => import("./pages/leader/LeaderCreateServiceOrder"));
const LeaderServiceOrderDetail = lazy(() => import("./pages/leader/LeaderServiceOrderDetail"));
const LeaderQuoteList = lazy(() => import("./pages/leader/quotes/LeaderQuoteList"));
const LeaderCreateQuotation = lazy(() => import("./pages/leader/quotes/LeaderCreateQuotation"));
const LeaderIssuesReportHistory = lazy(() => import("./pages/leader/LeaderIssuesReportHistory"));

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
      <InitialRoleRedirect />
      <Routes>
        <Route path="/" element={<Header />}>
          <Route path="" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="parts" element={<Parts />} />
          <Route path="news" element={<News />} />
          <Route path="phone-service" element={<BookingPage />} />
          <Route path="login" element={<Login />} />
          <Route path="oauth-success" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route element={<ProtectedRoute requiredRoles={["CUSTOMER"]} />}>
            <Route path="user-profile" element={<UserProfile />} />
          </Route>
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="team" element={<Team />} />
          <Route path="otp-verification" element={<OtpVerification />} />
          <Route path="verify-phone" element={<VerifyPhone />} />
        </Route>

        <Route path="/video-call/:roomId" element={<VideoCallRoom />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin Dashboard */}
        <Route element={<ProtectedRoute requiredRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="" element={<AdminStatistics />} />
            <Route path="services-category" element={<AdminServicesCategories />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="services" element={<AdminServiceCatalog />} />
            <Route path="staff" element={<AdminStaffManagement />} />
            <Route path="warranty" element={<AdminWarrantyPolicies />} />
            <Route path="technical-documents" element={<AdminTechnicalDocuments />} />
            <Route path="statistics" element={<AdminStatistics />} />
            <Route path="ai-analysis" element={<AdminAiAnalysis />} />
            <Route path="customers" element={<AdminCustomerManagement />} />
            <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute requiredRoles={["INVENTORY_MANAGER"]} />}>
          <Route path="/inventory" element={<InventoryLayout />}>
            <Route path="" element={<InventoryDashboard />} />
            <Route path="parts" element={<InventoryParts />} />
            <Route path="categories" element={<PartCategories />} />
            <Route path="import" element={<ImportHistory />} />
            <Route path="waiting-stock" element={<InventoryWaitingStock />} />
            <Route path="restock-requests" element={<InventoryRestockRequests />} />
            <Route path="suppliers" element={<InventorySuppliers />} />
            <Route path="approved-quotes" element={<InventoryApprovedQuotes />} />
            <Route path="export" element={<InventoryExport />} />
            <Route path="restock-suggestions" element={<InventoryRestockSuggestions />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute requiredRoles={["TECHNICIAN"]} />}>
          <Route path="/technician" element={<TechnicianLayout />}>
            <Route path="" element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<TechnicianOverview />} />
            <Route path="assignments" element={<TechnicianAssignments />} />
            <Route path="assignments/:id" element={<TechnicianAssignmentsDetail />} />
            <Route path="work-history" element={<TechnicianWorkHistory />} />
            <Route path="parts-request" element={<Navigate to="/technician/work-history" replace />} />
            <Route path="parts-request/:id" element={<Navigate to="/technician/work-history" replace />} />
            <Route path="progress" element={<TechnicianUpdateProgress />} />
            <Route path="progress/:id" element={<TechnicianUpdateProgress />} />
            <Route path="my-shifts" element={<TechnicianMyShifts />} />
            <Route path="issues-reports" element={<TechnicianIssuesReportHistory />} />
            <Route path="rescue" element={<TechnicianRescuePage />} />
            <Route path="repair-notes" element={<TechnicianAddRepairNote />} />
          </Route>
        </Route>

        {/* Reception Dashboard */}
        <Route element={<ProtectedRoute requiredRoles={["RECEPTIONIST", "TECHNICIAN_LEADER"]} />}>
          <Route path="/reception" element={<ReceptionLayout />}>
            <Route path="" element={<Navigate to="appointments" replace />} />
            <Route path="appointments" element={<ReceptionAppointmentList />} />
            <Route path="appointments/new" element={<ReceptionCreateAppointment />} />
            <Route path="appointments/:id" element={<ReceptionAppointmentDetail />} />
            <Route path="service-orders" element={<ReceptionServiceOrderList />} />
            <Route path="service-orders/:id" element={<ReceptionServiceOrderDetail />} />
            <Route path="service-orders/create" element={<ReceptionCreateServiceOrder />} />
            <Route path="customers" element={<ReceptionCustomerList />} />
            <Route path="customers/receive" element={<ReceptionReceiveCustomer />} />
            <Route path="customers/rescue-service-order/:rescueId" element={<ReceptionRescueCreateServiceOrder />} />
            <Route path="service-history" element={<ReceptionServiceHistory />} />
            <Route path="payments" element={<ReceptionProcessPayment />} />
            <Route path="quotes" element={<ReceptionQuoteList />} />
            <Route path="technicians" element={<ReceptionTechnicianList />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute requiredRoles={["TECHNICIAN_LEADER"]} />}>
          <Route path="/leader" element={<LeaderLayout />}>
            <Route path="" element={<LeaderDashboard />} />
            <Route path="appointments" element={<LeaderAppointmentList />} />
            <Route path="appointments/create-service-order" element={<LeaderCreateServiceOrder />} />
            <Route path="service-orders/:id" element={<LeaderServiceOrderDetail />} />
            <Route path="assignments" element={<LeaderAssignments />} />
            <Route path="task-tracking" element={<LeaderTaskTracking />} />
            <Route path="quotes" element={<LeaderQuoteList />} />
            <Route path="quotes/create" element={<LeaderCreateQuotation />} />
            <Route path="issues-report" element={<LeaderIssuesReportHistory />} />
          </Route>
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
