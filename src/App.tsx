import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./pages/customer/Header";
import Home from "./pages/customer/home/Home";
import Services from "./pages/customer/services/Services";
import Parts from "./pages/customer/parts/Parts";
import BookingPage from "./pages/customer/booking/BookingPage";
import Signup from "./pages/customer/home/SingUp";
import Footer from "./pages/customer/Footer";
import Login from "./pages/customer/home/Login";
import UserProfile from "./pages/customer/UserProfile/UserProfile";
import ForgotPassword from "./pages/customer/home/ForgotPassword";
import Team from "./pages/customer/team/Team";
import OtpVerification from "./pages/customer/home/verify-otp";
import VerifyPhone from "./pages/customer/home/verify-phone";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/dashboard/AdminDashboard";
import AdminSettings from "./pages/admin/settings/AdminSettings";
import AdminServicesCategories from "./pages/admin/services/AdminServicesCategories";
import AdminResources from "./pages/admin/resources/AdminResources";
import AdminServiceCatalog from "./pages/admin/services/AdminServiceCatalog";
import AdminStaffManagement from "./pages/admin/staff/AdminStaffManagement";
import AdminSpareParts from "./pages/parts/AdminSpareParts";
import InventoryLayout from "./pages/inventory/InventoryLayout";
import PartCategories from "./pages/inventory/category/InventoryPartCategories";

function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");
  return (
    <>
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
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<AdminDashboard />} />
          <Route path="spare-part" element={<AdminSpareParts />} />
          <Route path="services-category" element={<AdminServicesCategories />} />
          <Route path="resources" element={<AdminResources />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="services" element={<AdminServiceCatalog />} />
          <Route path="staff" element={<AdminStaffManagement />} />
        </Route>
        <Route path="/inventory" element={<InventoryLayout />}>
          <Route path="categories" element={<PartCategories />} />
        </Route>

      </Routes>
      {!isAdminPath && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
    </>
  );
}

export default App;
