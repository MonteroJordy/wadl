export type UserRole =
  | "owner"
  | "manager"
  | "staff"
  | "guest"
  | "door_staff"
  | "door_manager";
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
  | "cancelled"
  | "do_not_admit";

export interface Profile {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  account_id: string | null;
  tour_completed_at: string | null;
  tour_dismissed_at: string | null;
  demo_seeded_at: string | null;
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

export interface WadlEvent {
  id: string;
  account_id: string;
  venue_id: string | null;
  event_type: EventType;
  name: string;
  description: string | null;
  flyer_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventNight {
  id: string;
  event_id: string;
  night_date: string;
  doors_at: string;
  cutoff_at: string | null;
  capacity_cap: number | null;
  lockdown_threshold_pct: number;
  is_frozen: boolean;
  created_at: string;
}

export interface Allocation {
  id: string;
  event_night_id: string;
  holder_name: string;
  holder_phone: string | null;
  holder_email: string | null;
  magic_link_token: string;
  cap: number;
  auto_approve: boolean;
  list_open: boolean;
  plus_ones_allowed: boolean;
  created_by: string;
  created_at: string;
}

export interface AllocationToken {
  id: string;
  allocation_id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface Guest {
  id: string;
  event_night_id: string;
  allocation_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  plus_ones: number;
  tier: Tier;
  status: RsvpStatus;
  qr_token: string | null;
  check_in_token: string | null;
  phone_verified_at: string | null;
  flag_dna: boolean;
  flag_reason: string | null;
  added_by_user_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface StaffInvite {
  id: string;
  event_id: string;
  phone: string;
  role: "door_staff" | "door_manager";
  token: string;
  invited_by: string;
  used_at: string | null;
  used_by: string | null;
  expires_at: string | null;
  created_at: string;
}
