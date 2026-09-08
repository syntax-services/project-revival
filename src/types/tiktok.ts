export interface BusinessTikTokConnection {
  id: string;
  business_id: string;
  tiktok_open_id: string;
  tiktok_username: string | null;
  tiktok_display_name: string | null;
  tiktok_avatar_url: string | null;
  access_token: string;
  refresh_token: string;
  token_type: string | null;
  expires_at: string;
  refresh_expires_at: string;
  scope: string;
  is_connected: boolean;
  auto_boost_enabled: boolean;
  auto_boost_frequency: "daily" | "weekly" | "biweekly";
  total_promotions_posted: number;
  total_tiktok_views: number;
  total_tiktok_likes: number;
  last_promoted_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TikTokProductPromotion {
  id: string;
  business_id: string;
  product_id: string | null;
  tiktok_publish_id: string | null;
  tiktok_post_id: string | null;
  video_url: string | null;
  caption: string | null;
  product_backlink_url: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  status: "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
    images?: string[] | null;
  } | null;
}
