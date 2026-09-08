import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey;

    if (!supabaseUrl) {
      throw new Error("Supabase configuration is missing");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization session. Please log in." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { code, business_id, redirect_uri } = body;

    if (!code || typeof code !== "string") {
      return jsonResponse({ error: "Missing authorization code from TikTok." }, 400);
    }

    if (!business_id || typeof business_id !== "string") {
      return jsonResponse({ error: "Missing business profile identifier." }, 400);
    }

    const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY")?.trim();
    const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET")?.trim();
    const redirectUri = (redirect_uri || Deno.env.get("TIKTOK_REDIRECT_URI") || "https://www.string.com.ng/callback").trim();

    if (!clientKey || !clientSecret) {
      console.error("Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET environment variables");
      return jsonResponse({ error: "TikTok service is not properly configured on server." }, 500);
    }

    // 1. Exchange authorization code for TikTok Access & Refresh Tokens
    const tokenParams = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code.trim(),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("TikTok token exchange HTTP error:", tokenResponse.status, errorText);
      return jsonResponse(
        { error: "TikTok authentication failed. Please re-authorize your account." },
        400
      );
    }

    const tokenResult = await tokenResponse.json();

    // Support both direct root and nested data wrappers in TikTok responses
    const tokenData = tokenResult.data || tokenResult;

    if (tokenResult.error && tokenResult.error.code !== "ok" && tokenResult.error.code !== 0) {
      console.error("TikTok token response error object:", tokenResult.error);
      return jsonResponse(
        { error: tokenResult.error.message || "Failed to exchange TikTok authorization code." },
        400
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const openId = tokenData.open_id;
    const expiresIn = Number(tokenData.expires_in) || 86400;
    const refreshExpiresIn = Number(tokenData.refresh_expires_in) || 31536000;
    const scope = tokenData.scope || "user.info.basic,video.upload,video.publish";

    if (!accessToken || !openId) {
      console.error("Missing access_token or open_id in TikTok response:", tokenResult);
      return jsonResponse(
        { error: "Invalid token response received from TikTok." },
        502
      );
    }

    // 2. Fetch TikTok User Profile information
    let displayName = "TikTok Merchant";
    let username = "merchant";
    let avatarUrl = "";

    try {
      const userInfoUrl = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username";
      const userInfoResponse = await fetch(userInfoUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfoJson = await userInfoResponse.json();
        const userObj = userInfoJson.data?.user || userInfoJson.data || userInfoJson.user || {};
        displayName = userObj.display_name || userObj.username || displayName;
        username = userObj.username || userObj.display_name || username;
        avatarUrl = userObj.avatar_url || userObj.avatar_url_100 || "";
      } else {
        console.warn("Could not fetch TikTok user info:", userInfoResponse.status);
      }
    } catch (profileErr) {
      console.warn("Non-fatal profile fetch warning:", profileErr);
    }

    // 3. Connect Supabase Client with Caller's Session for RLS & RPC Security
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Execute connect_or_update_business_tiktok RPC
    const { data: rpcData, error: rpcError } = await supabaseUserClient.rpc(
      "connect_or_update_business_tiktok",
      {
        p_business_id: business_id,
        p_tiktok_open_id: openId,
        p_tiktok_username: username,
        p_tiktok_display_name: displayName,
        p_tiktok_avatar_url: avatarUrl,
        p_access_token: accessToken,
        p_refresh_token: refreshToken,
        p_expires_in: expiresIn,
        p_refresh_expires_in: refreshExpiresIn,
        p_scope: scope,
      }
    );

    if (rpcError) {
      console.error("RPC connect_or_update_business_tiktok error:", rpcError);
      
      // Fallback with service client if user token had an RLS race
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const userToken = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: userAuthError } = await supabaseAdmin.auth.getUser(userToken);

      if (userAuthError || !user) {
        return jsonResponse({ error: "Session expired. Please log in again." }, 401);
      }

      // Verify ownership directly
      const { data: biz, error: bizError } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("id", business_id)
        .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();

      if (bizError || !biz) {
        return jsonResponse({ error: "You are not authorized to manage this business." }, 403);
      }

      const { data: adminRpcData, error: adminRpcError } = await supabaseAdmin
        .from("business_tiktok_connections")
        .upsert({
          business_id,
          tiktok_open_id: openId,
          tiktok_username: username,
          tiktok_display_name: displayName,
          tiktok_avatar_url: avatarUrl,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + refreshExpiresIn * 1000).toISOString(),
          scope,
          is_connected: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "business_id" })
        .select()
        .single();

      if (adminRpcError) {
        console.error("Admin fallback error:", adminRpcError);
        return jsonResponse({ error: "Failed to store TikTok connection securely." }, 500);
      }

      return jsonResponse({
        success: true,
        username: username || displayName,
        connection_id: adminRpcData.id,
      });
    }

    return jsonResponse({
      success: true,
      username: username || displayName,
      connection_id: rpcData?.connection_id,
    });
  } catch (err: unknown) {
    console.error("Unexpected error in tiktok-oauth-exchange:", err);
    return jsonResponse(
      { error: "Could not complete TikTok connection. Please try again." },
      500
    );
  }
});
