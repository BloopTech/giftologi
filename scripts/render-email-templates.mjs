/**
 * Renders react-email template components to HTML and updates
 * the content_email_templates table in Supabase.
 *
 * Usage: node scripts/render-email-templates.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
import { render } from "@react-email/render";
import { createClient } from "@supabase/supabase-js";
import React from "react";

// Template imports
import HostPurchaseAlertEmail from "../app/emails/HostPurchaseAlertEmail.js";
import HostEventReminderEmail from "../app/emails/HostEventReminderEmail.js";
import HostThankYouReminderEmail from "../app/emails/HostThankYouReminderEmail.js";
import HostWeeklySummaryEmail from "../app/emails/HostWeeklySummaryEmail.js";
import HostDeliveryUpdateEmail from "../app/emails/HostDeliveryUpdateEmail.js";
import VendorNewOrderEmail from "../app/emails/VendorNewOrderEmail.js";
import VendorOrderStatusEmail from "../app/emails/VendorOrderStatusEmail.js";
import VendorPayoutStatusEmail from "../app/emails/VendorPayoutStatusEmail.js";
import VendorProductReviewEmail from "../app/emails/VendorProductReviewEmail.js";
import VendorApplicationStatusEmail from "../app/emails/VendorApplicationStatusEmail.js";
import AdminNewVendorApplicationEmail from "../app/emails/AdminNewVendorApplicationEmail.js";
import AdminDisputeRefundEmail from "../app/emails/AdminDisputeRefundEmail.js";
import GuestOrderConfirmationEmail from "../app/emails/GuestOrderConfirmationEmail.js";
import GuestDeliveryUpdateEmail from "../app/emails/GuestDeliveryUpdateEmail.js";

/**
 * Maps template slug → { Component, defaultProps }
 * The defaultProps use {{variable}} placeholders so the Edge Function
 * can interpolate them at send time.
 */
const TEMPLATE_MAP = {
  host_purchase_alert: {
    Component: HostPurchaseAlertEmail,
    props: {
      host_name: "{{host_name}}",
      buyer_name: "{{buyer_name}}",
      registry_title: "{{registry_title}}",
      amount: "{{amount}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  host_event_reminder: {
    Component: HostEventReminderEmail,
    props: {
      host_name: "{{host_name}}",
      event_title: "{{event_title}}",
      days_until: "{{days_until}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  host_thank_you_reminder: {
    Component: HostThankYouReminderEmail,
    props: {
      host_name: "{{host_name}}",
      pending_count: "{{pending_count}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  host_weekly_summary: {
    Component: HostWeeklySummaryEmail,
    props: {
      host_name: "{{host_name}}",
      gifts_count: "{{gifts_count}}",
      views_count: "{{views_count}}",
      total_value: "{{total_value}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  host_delivery_update: {
    Component: HostDeliveryUpdateEmail,
    props: {
      host_name: "{{host_name}}",
      order_reference: "{{order_reference}}",
      status: "{{status}}",
      registry_title: "{{registry_title}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  vendor_new_order: {
    Component: VendorNewOrderEmail,
    props: {
      vendor_name: "{{vendor_name}}",
      order_reference: "{{order_reference}}",
      amount: "{{amount}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  vendor_order_status: {
    Component: VendorOrderStatusEmail,
    props: {
      vendor_name: "{{vendor_name}}",
      order_reference: "{{order_reference}}",
      status: "{{status}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  vendor_payout_status: {
    Component: VendorPayoutStatusEmail,
    props: {
      vendor_name: "{{vendor_name}}",
      payout_status: "{{payout_status}}",
      amount: "{{amount}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  vendor_product_review: {
    Component: VendorProductReviewEmail,
    props: {
      vendor_name: "{{vendor_name}}",
      product_name: "{{product_name}}",
      reviewer_name: "{{reviewer_name}}",
      rating: "{{rating}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  vendor_application_status: {
    Component: VendorApplicationStatusEmail,
    props: {
      vendor_name: "{{vendor_name}}",
      status: "{{status}}",
      reason: "{{reason}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  admin_new_vendor_application: {
    Component: AdminNewVendorApplicationEmail,
    props: {
      vendor_name: "{{vendor_name}}",
      application_id: "{{application_id}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  admin_dispute_refund: {
    Component: AdminDisputeRefundEmail,
    props: {
      order_reference: "{{order_reference}}",
      amount: "{{amount}}",
      reason: "{{reason}}",
      dashboard_url: "{{dashboard_url}}",
    },
  },
  guest_order_confirmation: {
    Component: GuestOrderConfirmationEmail,
    props: {
      guest_name: "{{guest_name}}",
      order_reference: "{{order_reference}}",
      amount: "{{amount}}",
      registry_title: "{{registry_title}}",
      tracking_url: "{{tracking_url}}",
    },
  },
  guest_delivery_update: {
    Component: GuestDeliveryUpdateEmail,
    props: {
      guest_name: "{{guest_name}}",
      order_reference: "{{order_reference}}",
      status: "{{status}}",
      tracking_url: "{{tracking_url}}",
    },
  },
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let updated = 0;
  let skipped = 0;

  for (const [slug, { Component, props }] of Object.entries(TEMPLATE_MAP)) {
    try {
      const html = await render(React.createElement(Component, props));

      const { error } = await supabase
        .from("content_email_templates")
        .update({ body: html, updated_at: new Date().toISOString() })
        .eq("name", slug);

      if (error) {
        console.error(`  ✗ ${slug}: ${error.message}`);
        skipped++;
      } else {
        console.log(`  ✓ ${slug}`);
        updated++;
      }
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main();
