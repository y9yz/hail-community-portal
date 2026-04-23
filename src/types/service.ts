export interface Service {
  id: string;
  provider_id: string;
  title: string;
  category: string;
  description: string;
  image_url: string | null;
  license_url: string | null;
  maps_link: string | null;
  price: number;
  admin_status: "pending_admin" | "approved" | "rejected";
  address_name: string | null;
  created_at: string;
  updated_at: string;
  provider?: { full_name: string };
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  service_id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  client?: { full_name: string };
}

export interface SupportTicket {
  id: string;
  user_id: string;
  booking_id?: string | null;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: { full_name: string; phone?: string | null };
  booking?: { order_number: number; service_title: string } | null;
}

export interface ProviderSubscription {
  id: string;
  provider_id: string;
  trial_ends_at: string;
  expires_at: string;
  status: "trial" | "active" | "expired";
  amount: number;
  activated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
