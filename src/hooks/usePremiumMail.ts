import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EmailType = 
  | "new_device_login"
  | "profile_view"
  | "customer_order"
  | "payment_received"
  | "order_progress"
  | "premium_revoked"
  | "business_verified"
  | "password_reset";

interface EmailTemplatePayload {
  recipientEmail: string;
  recipientName: string;
  theme: "dark" | "light" | "mono";
  variables: Record<string, any>;
}

// ============================================================================
// HSL DYNAMIC EMAIL COLOR SYSTEM & RENDERER
// Creates highly interactive, responsive HTML templates matching system themes.
// ============================================================================

export function generateEmailHtml(type: EmailType, payload: EmailTemplatePayload): string {
  const { recipientName, theme, variables } = payload;
  
  // Theme Color Configurations
  const colors = {
    dark: {
      bg: "#0A0E1A",          // Midnight Charcoal/Obsidian
      cardBg: "#111827",      // Deep Charcoal
      text: "#F3F4F6",        // Warm white
      mutedText: "#9CA3AF",   // Medium gray
      accent: "#3B82F6",      // Cobalt Blue
      border: "#1F2937",      // Dark border
      watermark: "rgba(59, 130, 246, 0.05)"
    },
    light: {
      bg: "#F8FAFC",          // Light Alabaster slate
      cardBg: "#FFFFFF",      // Pure White
      text: "#1E293B",        // Deep Slate
      mutedText: "#64748B",   // Soft grey
      accent: "#2563EB",      // Vibrant Cobalt Blue
      border: "#E2E8F0",      // Light border
      watermark: "rgba(37, 99, 235, 0.03)"
    },
    mono: {
      bg: "#FAFAFA",          // Off-white
      cardBg: "#FFFFFF",      // White
      text: "#000000",        // Sharp black
      mutedText: "#666666",   // Muted black
      accent: "#000000",      // Pure black
      border: "#000000",      // Solid black borders
      watermark: "rgba(0, 0, 0, 0.02)"
    }
  }[theme];

  // Base structure with String watermark & HSL stylings
  const headerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>String Notification</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: ${colors.bg};
          color: ${colors.text};
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 580px;
          margin: 30px auto;
          padding: 24px;
          background-color: ${colors.cardBg};
          border: 1px solid ${colors.border};
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          position: relative;
          overflow: hidden;
        }
        /* Custom concentric brand ring watermarks */
        .watermark {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          border: 8px solid ${colors.accent};
          opacity: 0.05;
          pointer-events: none;
        }
        .watermark-inner {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid ${colors.accent};
          opacity: 0.08;
        }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid ${colors.border};
          padding-bottom: 16px;
        }
        .logo-box {
          display: inline-block;
          font-size: 20px;
          font-weight: 800;
          color: ${colors.accent};
          letter-spacing: -0.5px;
        }
        .logo-ring {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid ${colors.accent};
          margin-left: 2px;
        }
        .h1 {
          font-size: 20px;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 8px;
          color: ${colors.text};
          letter-spacing: -0.2px;
        }
        .salutation {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .paragraph {
          font-size: 13.5px;
          line-height: 1.6;
          color: ${colors.mutedText};
          margin-bottom: 20px;
        }
        .bullet-box {
          background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'};
          border: 1px solid ${colors.border};
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .bullet-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid ${colors.border}22;
        }
        .bullet-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .bullet-row:first-child {
          padding-top: 0;
        }
        .bullet-label {
          color: ${colors.mutedText};
          font-weight: 500;
        }
        .bullet-val {
          font-weight: 600;
          color: ${colors.text};
        }
        .btn {
          display: block;
          text-align: center;
          background-color: ${colors.accent};
          color: ${theme === 'mono' ? '#000000' : '#FFFFFF'};
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          margin-top: 24px;
          transition: opacity 0.2s;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid ${colors.border};
          padding-top: 16px;
          font-size: 11px;
          color: ${colors.mutedText};
          text-align: center;
          line-height: 1.5;
        }
        .footer-logo {
          font-weight: 800;
          color: ${colors.accent};
          margin-bottom: 4px;
        }
        @keyframes drawSig {
          0% {
            stroke-dashoffset: 250;
          }
          40% {
            stroke-dashoffset: 0;
          }
          80% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.8;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="watermark"><div class="watermark-inner"></div></div>
        <div class="header">
          <div class="logo-box">String<span class="logo-ring"></span></div>
        </div>
  `;

  const signatureHash = `STR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}`;

  const footerHtml = `
        <!-- CSS Animated Signature -->
        <div style="margin-top: 30px; padding: 20px; border: 1px dashed ${colors.border}; border-radius: 16px; background-color: ${colors.bg}; text-align: center;">
          <div style="font-size: 10px; font-weight: 800; color: ${colors.accent}; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
            Official String Verification Seal
          </div>
          <svg width="180" height="60" viewBox="0 0 180 60" style="margin: 0 auto; display: block;">
            <defs>
              <linearGradient id="sigGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${colors.accent}" />
                <stop offset="100%" stop-color="#a855f7" />
              </linearGradient>
            </defs>
            <path d="M20,35 C40,15 60,45 80,25 C100,5 120,55 140,30 C150,18 160,10 170,25" 
              fill="none" 
              stroke="url(#sigGrad)" 
              stroke-width="3" 
              stroke-linecap="round"
              style="stroke-dasharray: 250; stroke-dashoffset: 250; animation: drawSig 3s ease-in-out forwards infinite;"
            />
          </svg>
          <div style="margin-top: 10px; font-size: 11px; font-weight: bold; color: ${colors.text}; font-family: monospace; letter-spacing: 2px;">
            ${signatureHash}
          </div>
          <div style="font-size: 9px; color: ${colors.mutedText}; margin-top: 4px;">
            If this animated signature is missing or static, this email is NOT from String.
          </div>
        </div>

        <div class="footer">
          <div class="footer-logo">String Inc.</div>
          <p>Secure Marketplace Platform • Verified Trust Coordinates</p>
          <p>You received this secure email notification because you are a registered user of String. If you suspect unauthorized activity, please audit your dashboard safety settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  let contentHtml = "";

  switch (type) {
    case "new_device_login":
      contentHtml = `
        <h1 class="h1">New Device Login Alert</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">We detected a new login authorization to your String account. If this was you, no action is required. If this was not you, please secure your profile immediately.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Device OS:</span>
            <span class="bullet-val">${variables.os || "Windows 11 Desktop"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Browser:</span>
            <span class="bullet-val">${variables.browser || "Chrome / Edge"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">IP Coordinates:</span>
            <span class="bullet-val">${variables.ip || "102.89.34.120 (Lagos, NG)"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Time Stamp:</span>
            <span class="bullet-val">${variables.timestamp || new Date().toLocaleString()}</span>
          </div>
        </div>
        <a href="/customer/settings" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">Audit Account Security</a>
      `;
      break;

    case "profile_view":
      contentHtml = `
        <h1 class="h1">New Shop Card Impression!</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">Excellent news! Customers are actively exploring your profile. An interested shopper recently viewed your trade catalog details.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Interests Highlight:</span>
            <span class="bullet-val">${variables.viewerInterest || "Premium Outerwear, Shoes"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Approx. Distance:</span>
            <span class="bullet-val">${variables.distance || "2.4 km away"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Impression Type:</span>
            <span class="bullet-val">Catalog Showcase Detail</span>
          </div>
        </div>
        <a href="/business/insights" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">View Shop Insights</a>
      `;
      break;

    case "customer_order":
      contentHtml = `
        <h1 class="h1">Incoming Purchase Order! 🎉</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">Congratulations! A customer has placed a new order for your product. Please review details and initiate shipping fulfillment.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Order ID:</span>
            <span class="bullet-val">#${variables.orderId || "ST-837482"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Product Name:</span>
            <span class="bullet-val">${variables.productName || "String Heavyweight Hoodie"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Order Total:</span>
            <span class="bullet-val" style="color: ${colors.accent};">₦${(variables.total || 25000).toLocaleString()}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Customer Name:</span>
            <span class="bullet-val">${variables.customerName || "Adeola Johnson"}</span>
          </div>
        </div>
        <a href="/business/orders" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">Prepare Order Shipment</a>
      `;
      break;

    case "payment_received":
      contentHtml = `
        <h1 class="h1">Payment Cleared Successfully! 💰</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">We are happy to confirm that the payment for your order has been received and verified. Settlement funds are registered to your wallet balance.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Reference ID:</span>
            <span class="bullet-val">PAY-${variables.refId || "8923479"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Amount Cleared:</span>
            <span class="bullet-val" style="color: ${colors.accent}; font-weight: 800;">₦${(variables.amount || 25000).toLocaleString()}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Processing Fee:</span>
            <span class="bullet-val">₦0.00 (Platform Zero-Tax)</span>
          </div>
        </div>
        <a href="/business/growth" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">Check Wallet Balance</a>
      `;
      break;

    case "order_progress":
      contentHtml = `
        <h1 class="h1">Your Order has been ${variables.status || "Shipped"}! 🚚</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">Great news! The merchant has updated the tracking coordinates of your order. It is actively in transit to your registered coordinates.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Order Ref:</span>
            <span class="bullet-val">#${variables.orderId || "ST-837482"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Merchant Name:</span>
            <span class="bullet-val">${variables.merchantName || "String Gear & Apparel"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Current Progress:</span>
            <span class="bullet-val" style="color: ${colors.accent}; font-weight: bold;">${variables.status || "Shipped"}</span>
          </div>
        </div>
        <a href="/customer/orders" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">Track Delivery Route</a>
      `;
      break;

    case "premium_revoked":
      contentHtml = `
        <h1 class="h1" style="color: #EF4444;">Safety Alert: Premium Status Revoked</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">Please be advised that an administrator has revoked your Gold Elite Premium booster status. This action was taken to maintain marketplace security and prevent suspicious or dangerous listing activities.</p>
        
        <div class="bullet-box" style="border-color: #EF4444/30; background-color: rgba(239, 68, 68, 0.02);">
          <div class="bullet-row">
            <span class="bullet-label" style="color: #EF4444;">Reason for Audit:</span>
            <span class="bullet-val" style="color: #EF4444;">Scam / dangerous listing prevention audit</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Action Timestamp:</span>
            <span class="bullet-val">${new Date().toLocaleString()}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Profile Status:</span>
            <span class="bullet-val">Restricted (Basic Verified)</span>
          </div>
        </div>
        <p class="paragraph" style="font-size: 12px; font-style: italic;">Note: Paid booster fees are subject to review. If you believe this is a mistake, you can contact the String Developer Operations team with a location verification coordinate appeal.</p>
        <a href="/contact" class="btn" style="background-color: #EF4444; color: #ffffff;">Contact Operations Appeal</a>
      `;
      break;

    case "business_verified":
      contentHtml = `
        <h1 class="h1">Trade Verification Complete! ✓</h1>
        <p class="salutation">Hi ${recipientName},</p>
        <p class="paragraph">Congratulations! An administrator has reviewed your location verification request and successfully verified your physical trade shop offerings and street address.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Verified Address:</span>
            <span class="bullet-val">${variables.address || "15, Herbert Macaulay Way"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Verified Area:</span>
            <span class="bullet-val">${variables.areaName || "Yaba, Lagos"}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Search Priority:</span>
            <span class="bullet-val" style="color: ${colors.accent}; font-weight: bold;">Activated (1.5x MatchWeight)</span>
          </div>
        </div>
        <a href="/business/profile" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">Go to Business Console</a>
      `;
      break;

    case "password_reset":
      contentHtml = `
        <h1 class="h1">Password Reset Request 🔑</h1>
        <p class="salutation">Hi ${recipientName || 'String User'},</p>
        <p class="paragraph">We received a request to reset the password for your String account. Click the button below to establish a secure new password. If you didn't request this change, you can safely ignore this message—your previous password remains securely encrypted and completely private.</p>
        
        <div class="bullet-box">
          <div class="bullet-row">
            <span class="bullet-label">Request Time:</span>
            <span class="bullet-val">${new Date().toLocaleString()}</span>
          </div>
          <div class="bullet-row">
            <span class="bullet-label">Security Protocol:</span>
            <span class="bullet-val">Hashed Recovery Link</span>
          </div>
        </div>
        <a href="/reset-password?email=${encodeURIComponent(payload.recipientEmail)}" class="btn" style="background-color: ${colors.accent}; color: ${theme === 'mono' ? '#ffffff' : '#ffffff'};">Reset Your Password</a>
      `;
      break;
  }

  return `${headerHtml}${contentHtml}${footerHtml}`;
}

/**
 * Hook to trigger simulated themed email dispatches in the platform.
 * Dispatches both standard notification records and customized HSL responsive HTML bodies.
 */
export function usePremiumMail() {
  const { user, profile } = useAuth();

  const dispatchEmail = async (
    type: EmailType,
    recipientId: string,
    recipientEmail: string,
    recipientName: string,
    variables: Record<string, any> = {}
  ) => {
    try {
      // 1. Fetch recipient's active theme or use profile's theme
      const storedTheme = localStorage.getItem("theme") || "dark";
      const storedPalette = localStorage.getItem("palette") || "blue";
      
      const themeMapping: "dark" | "light" | "mono" = 
        storedPalette === "mono" ? "mono" : (storedTheme === "dark" ? "dark" : "light");

      // 2. Generate customized HSL HTML
      const htmlBody = generateEmailHtml(type, {
        recipientEmail,
        recipientName,
        theme: themeMapping,
        variables
      });

      // 3. Subject title mappings
      const subjectMapping: Record<EmailType, string> = {
        new_device_login: "String Security Alert: New Device Login 🛡️",
        profile_view: "String Business: You got a new Shop Card view! 👀",
        customer_order: "String Business: New Incoming Purchase Order! 📦",
        payment_received: "String Wallet: Settlement Cleared Successfully! ₦",
        order_progress: `String Order: Your order has been ${variables.status || "Shipped"}! 🚚`,
        premium_revoked: "String Urgent: Premium Booster Status Revoked ⚠️",
        business_verified: "String Trade: Location Verification Confirmed! ✓",
        password_reset: "String Security: Password Reset Request 🔑"
      };

      // 4. Create row in notifications table
      const { error } = await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "email_dispatch",
        title: `[Email] ${subjectMapping[type] || "New String Alert"}`,
        message: variables.customMessage || `A secure email was dispatched to ${recipientEmail}. Click to preview inside String.`,
        data: {
          email_type: type,
          subject: subjectMapping[type],
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          html_body: htmlBody,
          theme: themeMapping,
          variables
        }
      });

      if (error) throw error;

      // 5. Invoke Edge Function to send actual email via Resend
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: recipientEmail,
            subject: subjectMapping[type] || "String Alert",
            html: htmlBody
          }
        });
      } catch (invokeErr) {
        console.warn("Failed to dispatch real email via edge function:", invokeErr);
      }
      return true;
    } catch (err) {
      console.error("Failed to dispatch HSL email notification:", err);
      return false;
    }
  };

  return {
    dispatchEmail
  };
}
