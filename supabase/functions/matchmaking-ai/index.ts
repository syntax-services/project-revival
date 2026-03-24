import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
        if (!GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is not configured");
        }

        const { userPreferences, businesses } = await req.json();

        if (!businesses || !Array.isArray(businesses)) {
            throw new Error("Invalid businesses data");
        }

        // Call Groq API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama3-70b-8192", // High capacity Groq model commonly used
                messages: [
                    {
                        role: "system",
                        content: "You are the advanced Matchmaking AI for the 'String' platform. Evaluate the list of businesses against the user's preferences. For each business, provide an 'ai_match_score' (0-100) and an 'ai_insights' array listing potential benefits and 'possible problems' the user might face with this business (e.g. lack of reviews, mismatch in target audience, distance). Also, provide a list of 'related_items' which are strings of other goods/services related to the user's search. Output strictly as a JSON object with keys: 'businesses' (array of { id, ai_match_score, ai_insights }) and 'related_items' (array of strings).",
                    },
                    {
                        role: "user",
                        content: `User Preferences: ${JSON.stringify(userPreferences)}\n\nBusinesses: ${JSON.stringify(businesses.map(b => ({ id: b.id, name: b.company_name, industry: b.industry, reviews: b.total_reviews, reputation: b.reputation_score, products: b.products_services, location: b.business_location })))}`,
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.2,
            }),
        });

        const data = await response.json();
        let aiResults = [];
        let relatedItems = [];

        if (data.choices && data.choices[0] && data.choices[0].message) {
            try {
                const parsed = JSON.parse(data.choices[0].message.content);
                aiResults = parsed.businesses || [];
                relatedItems = parsed.related_items || [];
            } catch (e) {
                console.error("Failed to parse Groq response:", e);
            }
        }

        return new Response(JSON.stringify({ success: true, aiResults, relatedItems }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: unknown) {
        console.error("Matchmaking AI Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ success: false, error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
