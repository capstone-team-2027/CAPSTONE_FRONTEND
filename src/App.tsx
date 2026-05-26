import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./pages/customer/Header";
import Home from "./pages/customer/Home/Home";
import Services from "./pages/customer/Service/Services";
import Parts from "./pages/customer/Parts/Parts";
import BookingPage from "./pages/customer/Booking/BookingPage";
import Signup from "./pages/customer/Home/SingUp";
import Footer from "./pages/customer/Footer";
import Login from "./pages/customer/Home/Login";
import UserProfile from "./pages/customer/UserProfile/UserProfile";
import ForgotPassword from "./pages/customer/Home/ForgotPassword";
import Team from "./pages/customer/Team/Team";
import OtpVerification from "./pages/customer/Home/verify-otp";
import VerifyPhone from "./pages/customer/Home/verify-phone";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminServices from "./pages/admin/services/AdminServices";

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
          <Route path="userprofile" element={<UserProfile />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="team" element={<Team />} />
          <Route path="otp-verification" element={<OtpVerification />} />
          <Route path="verify-phone" element={<VerifyPhone />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<AdminDashboard />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="settings" element={<AdminSettings />} />
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
