import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const Checkout = () => {
  useEffect(() => {}, []);

  return <Navigate to="/my-bookings" replace />;
};

export default Checkout;
