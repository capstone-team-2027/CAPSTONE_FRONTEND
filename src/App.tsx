import { Route, Routes } from "react-router-dom"
import Header from "./pages/customer/Header"
import Home from "./pages/customer/Home/Home"
import Services from "./pages/customer/Service/Services"
import Parts from "./pages/customer/Parts/Parts"
import BookingPage from "./pages/customer/Booking/BookingPage"
import Signup from "./pages/customer/Home/SingUp"
import Footer from "./pages/customer/Footer"
import Login from "./pages/customer/Home/Login"
import UserProfile from "./pages/customer/UserProfile/UserProfile"

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Header />} >
          <Route path="" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="parts" element={<Parts />} />
          <Route path="/phone-service" element={<BookingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/userprofile" element={<UserProfile />} />
        </Route>

      </Routes>
      {/* <LazySection minHeight="300px"> */}
      <Footer />
      {/* </LazySection> */}
    </>
  )
}

export default App
