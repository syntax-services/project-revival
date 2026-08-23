#!/usr/bin/env node

/**
 * Supabase Keep-Alive Ping Script
 *
 * This script sends lightweight API requests to your Supabase project to
 * register activity and prevent automatic project pausing on the Free Tier.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kxynwcuhgawnhqoexpti.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eW53Y3VoZ2F3bmhxb2V4cHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDAxNDYsImV4cCI6MjA4NTUxNjE0Nn0.W7p6v78dZBMGKIYWlrnFWMeSgzVHXWXSapudY-qgAEI";

async function pingSupabase() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Initiating Supabase Keep-Alive Ping...`);
  console.log(`Target URL: ${SUPABASE_URL}`);

  const endpoints = [
    {
      name: "PostgREST Root",
      url: `${SUPABASE_URL}/rest/v1/`,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
    {
      name: "Profiles Table Query",
      url: `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  ];

  let successCount = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: "GET",
        headers: endpoint.headers,
      });

      console.log(`- [${endpoint.name}] HTTP Status: ${response.status} ${response.statusText}`);

      if (response.ok || response.status === 200 || response.status === 204) {
        successCount++;
      }
    } catch (err) {
      console.error(`- [${endpoint.name}] Request failed:`, err.message);
    }
  }

  if (successCount > 0) {
    console.log(`✅ Keep-alive ping successful! (${successCount}/${endpoints.length} endpoints responded)`);
    process.exit(0);
  } else {
    console.error(`❌ Keep-alive ping failed for all endpoints.`);
    process.exit(1);
  }
}

pingSupabase();
