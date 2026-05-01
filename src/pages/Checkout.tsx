import { useEffect } from "react";
import { Navigate } from "react-router-dom";

/* تحويل المسار بعد إلغاء الدفع الإلكتروني من المنصة */
const Checkout = () => {
  useEffect(() => {}, []);

  /* توجيه المستخدم لسجل الطلبات؛ الدفع حالياً ميداني عند المزود */
  return <Navigate to="/my-bookings" replace />;
};

export default Checkout;