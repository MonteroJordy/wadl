export type UserRole = "owner" | "manager" | "staff" | "guest";
export type AccountType = "venue" | "brand" | "individual";
export type EventType =
  | "venue_owned"
  | "brand_takeover"
  | "co_produced"
  | "brand_pop_up";
export type Tier = "ga" | "vip" | "all_access";
export type RsvpStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "cancelled";
export type CheckInState =
  | "approved"
  | "not_found"
  | "already_used"
  | "wrong_night"
  | "cancelled";

export interface Profile {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  account_type: AccountType;
  display_name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  account_id: string;
  name: string;
  address: string | null;
  city: string | null;
  timezone: string;
  default_capacity: number | null;
  created_at: string;
  updated_at: string;
}
