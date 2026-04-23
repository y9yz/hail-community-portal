import { useEffect } from "react";
import { Navigate } from "react-router-dom";

// Online payment between client and provider has been removed.
// All transactions happen offline (cash / POS) at the provider.
// Any old links to /checkout simply bounce back to the orders page.
const Checkout = () => {
  useEffect(() => {}, []);
  return <Navigate to="/my-bookings" replace />;
};

export default Checkout;
