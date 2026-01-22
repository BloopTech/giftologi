"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const CONTENT_ALLOWED_ROLES = [
  "super_admin",
  "finance_admin",
  "operations_manager_admin",
  "customer_support_admin",
  "marketing_admin",
];

async function getCurrentAdmin(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      currentProfile: null,
      errorResponse: {
        message: "You must be logged in to manage content.",
        errors: {},
        values: {},
        data: {},
      },
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  if (!currentProfile || !CONTENT_ALLOWED_ROLES.includes(currentProfile.role)) {
    return {
      user,
      currentProfile: null,
      errorResponse: {
        message: "You are not authorized to manage content.",
        errors: {},
        values: {},
        data: {},
      },
    };
  }

  return { user, currentProfile, errorResponse: null };
}

function slugify(value) {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "page";
}

// STATIC PAGES

const defaultStaticPageErrors = {
  pageId: [],
  title: [],
  metaDescription: [],
  body: [],
  status: [],
};

const saveStaticPageSchema = z.object({
  pageId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  title: z
    .string()
    .trim()
    .min(1, { message: "Meta title is required" }),
  metaDescription: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  body: z.string().trim().optional().or(z.literal("")),
  status: z
    .string()
    .trim()
    .transform((value) => (value || "draft").toLowerCase())
    .refine(
      (value) =>
        value === "draft" || value === "published" || value === "archived",
      {
        message: "Invalid status",
      }
    ),
});

export async function saveStaticPage(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultStaticPageErrors },
    };
  }

  const raw = {
    pageId: formData.get("pageId") || "",
    title: formData.get("title") || "",
    metaDescription: formData.get("metaDescription") || "",
    body: formData.get("body") || "",
    status: formData.get("status") || "draft",
  };

  const parsed = saveStaticPageSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultStaticPageErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { pageId, title, metaDescription, body, status } = parsed.data;

  let page = null;
  const now = new Date().toISOString();

  if (pageId) {
    const { data, error } = await supabase
      .from("content_static_pages")
      .update({
        title,
        meta_description: metaDescription || null,
        content: body || null,
        status,
        last_edited_by: currentProfile.id,
        updated_at: now,
      })
      .eq("id", pageId)
      .select("id, title, slug, status")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultStaticPageErrors },
        values: raw,
        data: {},
      };
    }

    page = data;
  } else {
    const slugSource = formData.get("slug") || title;
    const slug = slugify(slugSource);

    const { data, error } = await supabase
      .from("content_static_pages")
      .insert([
        {
          title,
          slug,
          meta_description: metaDescription || null,
          content: body || null,
          status,
          sort_order: 0,
          last_edited_by: currentProfile.id,
        },
      ])
      .select("id, title, slug, status")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultStaticPageErrors },
        values: raw,
        data: {},
      };
    }

    page = data;
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: pageId ? "updated_static_page" : "created_static_page",
    entity: "content_static_pages",
    targetId: page?.id || pageId,
    details: pageId
      ? `Updated static page ${pageId} (${title})`
      : `Created static page ${page?.id || ""} (${title})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: pageId ? "Page updated." : "Page created.",
    errors: {},
    values: {},
    data: { page },
  };
}

// EMAIL TEMPLATES

const defaultEmailTemplateErrors = {
  templateId: [],
  name: [],
  subject: [],
  senderName: [],
  body: [],
  category: [],
  recipientType: [],
  status: [],
};

const saveEmailTemplateSchema = z.object({
  templateId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  name: z
    .string()
    .trim()
    .min(1, { message: "Template name is required" }),
  subject: z
    .string()
    .trim()
    .min(1, { message: "Subject line is required" }),
  senderName: z.string().trim().optional().or(z.literal("")),
  body: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().optional().or(z.literal("")),
  recipientType: z.string().trim().optional().or(z.literal("")),
  status: z
    .string()
    .trim()
    .transform((value) => (value || "inactive").toLowerCase())
    .refine((value) => value === "inactive" || value === "active", {
      message: "Invalid status",
    }),
});

export async function saveEmailTemplate(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultEmailTemplateErrors },
    };
  }

  const raw = {
    templateId: formData.get("templateId") || "",
    name: formData.get("name") || "",
    subject: formData.get("subject") || "",
    senderName: formData.get("senderName") || "",
    body: formData.get("body") || "",
    category: formData.get("category") || "",
    recipientType: formData.get("recipientType") || "",
    status: formData.get("status") || "inactive",
  };

  const parsed = saveEmailTemplateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultEmailTemplateErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const {
    templateId,
    name,
    subject,
    senderName,
    body,
    category,
    recipientType,
    status,
  } = parsed.data;

  let template = null;
  const now = new Date().toISOString();

  if (templateId) {
    const { data, error } = await supabase
      .from("content_email_templates")
      .update({
        name,
        subject,
        sender_name: senderName || null,
        body: body || null,
        category: category || null,
        recipient_type: recipientType || null,
        status,
        updated_at: now,
      })
      .eq("id", templateId)
      .select("id, name, subject, status")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultEmailTemplateErrors },
        values: raw,
        data: {},
      };
    }

    template = data;
  } else {
    const { data, error } = await supabase
      .from("content_email_templates")
      .insert([
        {
          name,
          subject,
          sender_name: senderName || null,
          body: body || null,
          category: category || null,
          recipient_type: recipientType || null,
          status,
          sort_order: 0,
        },
      ])
      .select("id, name, subject, status")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultEmailTemplateErrors },
        values: raw,
        data: {},
      };
    }

    template = data;
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: templateId ? "updated_email_template" : "created_email_template",
    entity: "content_email_templates",
    targetId: template?.id || templateId,
    details: templateId
      ? `Updated email template ${templateId} (${name})`
      : `Created email template ${template?.id || ""} (${name})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: templateId ? "Email template updated." : "Email template created.",
    errors: {},
    values: {},
    data: { template },
  };
}

const defaultSendTestEmailTemplateErrors = {
  templateId: [],
  testEmail: [],
};

const sendTestEmailTemplateSchema = z.object({
  templateId: z.string().uuid({ message: "Invalid template" }),
  testEmail: z
    .string()
    .trim()
    .min(1, { message: "Test email is required" })
    .email({ message: "Enter a valid email address" }),
});

export async function sendTestEmailTemplate(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultSendTestEmailTemplateErrors },
    };
  }

  const raw = {
    templateId: formData.get("templateId") || "",
    testEmail: formData.get("testEmail") || "",
  };

  const parsed = sendTestEmailTemplateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultSendTestEmailTemplateErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { templateId, testEmail } = parsed.data;

  const { data: template, error: templateError } = await supabase
    .from("content_email_templates")
    .select(
      "id, name, subject, sender_name, body, category, recipient_type, status"
    )
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return {
      message: templateError?.message || "Template not found.",
      errors: { ...defaultSendTestEmailTemplateErrors },
      values: raw,
      data: {},
    };
  }

  const payload = {
    templateId,
    testEmail,
    name: template.name,
    subject: template.subject,
    senderName: template.sender_name || null,
    body: template.body || "",
    category: template.category || null,
    recipientType: template.recipient_type || null,
    status: template.status || null,
  };

  const { error: invokeError } = await supabase.functions.invoke(
    "send-test-email-template",
    {
      body: payload,
    }
  );

  if (invokeError) {
    return {
      message: invokeError.message || "Failed to send test email.",
      errors: { ...defaultSendTestEmailTemplateErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "sent_test_email_template",
    entity: "content_email_templates",
    targetId: templateId,
    details: `Sent test email for template ${templateId} to ${testEmail}`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: `Test email sent to ${testEmail}.`,
    errors: {},
    values: {},
    data: { templateId, testEmail },
  };
}

// FAQS

const defaultFaqErrors = {
  faqId: [],
  question: [],
  answer: [],
  category: [],
  sortOrder: [],
  visibility: [],
};

const saveFaqSchema = z.object({
  faqId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  question: z
    .string()
    .trim()
    .min(1, { message: "Question is required" }),
  answer: z
    .string()
    .trim()
    .min(1, { message: "Answer is required" }),
  category: z.string().trim().optional().or(z.literal("")),
  sortOrder: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const num = Number(value || 0);
      return Number.isFinite(num) && num >= 0 ? num : 0;
    }),
  visibility: z
    .string()
    .trim()
    .transform((value) => (value || "public").toLowerCase())
    .refine((value) => value === "public" || value === "internal", {
      message: "Invalid visibility",
    }),
});

export async function saveFaq(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultFaqErrors },
    };
  }

  const raw = {
    faqId: formData.get("faqId") || "",
    question: formData.get("question") || "",
    answer: formData.get("answer") || "",
    category: formData.get("category") || "",
    sortOrder: formData.get("sortOrder") || "",
    visibility: formData.get("visibility") || "public",
  };

  const parsed = saveFaqSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultFaqErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { faqId, question, answer, category, sortOrder, visibility } = parsed.data;

  let faq = null;
  const now = new Date().toISOString();

  if (faqId) {
    const { data, error } = await supabase
      .from("content_faqs")
      .update({
        question,
        answer,
        category: category || null,
        sort_order: sortOrder,
        visibility,
        updated_at: now,
      })
      .eq("id", faqId)
      .select("id, question, sort_order, visibility")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultFaqErrors },
        values: raw,
        data: {},
      };
    }

    faq = data;
  } else {
    const { data, error } = await supabase
      .from("content_faqs")
      .insert([
        {
          question,
          answer,
          category: category || null,
          sort_order: sortOrder,
          visibility,
        },
      ])
      .select("id, question, sort_order, visibility")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultFaqErrors },
        values: raw,
        data: {},
      };
    }

    faq = data;
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: faqId ? "updated_faq" : "created_faq",
    entity: "content_faqs",
    targetId: faq?.id || faqId,
    details: faqId
      ? `Updated FAQ ${faqId} (${question})`
      : `Created FAQ ${faq?.id || ""} (${question})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: faqId ? "FAQ updated." : "FAQ created.",
    errors: {},
    values: {},
    data: { faq },
  };
}

// CONTACT SETTINGS

const defaultContactSettingsErrors = {
  supportEmail: [],
  supportPhone: [],
  officeAddress: [],
  businessHours: [],
  whatsappLink: [],
};

const saveContactSettingsSchema = z.object({
  supportEmail: z.string().trim().optional().or(z.literal("")),
  supportPhone: z.string().trim().optional().or(z.literal("")),
  officeAddress: z.string().trim().optional().or(z.literal("")),
  businessHours: z.string().trim().optional().or(z.literal("")),
  whatsappLink: z.string().trim().optional().or(z.literal("")),
});

export async function saveContactSettings(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultContactSettingsErrors },
    };
  }

  const raw = {
    supportEmail: formData.get("supportEmail") || "",
    supportPhone: formData.get("supportPhone") || "",
    officeAddress: formData.get("officeAddress") || "",
    businessHours: formData.get("businessHours") || "",
    whatsappLink: formData.get("whatsappLink") || "",
  };

  const parsed = saveContactSettingsSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultContactSettingsErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const {
    supportEmail,
    supportPhone,
    officeAddress,
    businessHours,
    whatsappLink,
  } = parsed.data;

  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("content_contact_settings")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let settingsRow = null;

  if (existing && existing.id) {
    const { data, error } = await supabase
      .from("content_contact_settings")
      .update({
        support_email: supportEmail || null,
        support_phone: supportPhone || null,
        office_address: officeAddress || null,
        business_hours: businessHours || null,
        whatsapp_link: whatsappLink || null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultContactSettingsErrors },
        values: raw,
        data: {},
      };
    }

    settingsRow = data;
  } else {
    const { data, error } = await supabase
      .from("content_contact_settings")
      .insert([
        {
          support_email: supportEmail || null,
          support_phone: supportPhone || null,
          office_address: officeAddress || null,
          business_hours: businessHours || null,
          whatsapp_link: whatsappLink || null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultContactSettingsErrors },
        values: raw,
        data: {},
      };
    }

    settingsRow = data;
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "updated_contact_settings",
    entity: "content_contact_settings",
    targetId: settingsRow?.id || null,
    details: "Updated contact page settings.",
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "Contact settings updated.",
    errors: {},
    values: {},
    data: { settingsId: settingsRow?.id || null },
  };
}

// ARCHIVE & DELETE - STATIC PAGES

const defaultStaticPageIdErrors = {
  pageId: [],
};

const staticPageIdSchema = z.object({
  pageId: z.string().uuid({ message: "Invalid page" }),
});

export async function archiveStaticPage(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultStaticPageIdErrors },
    };
  }

  const raw = {
    pageId: formData.get("pageId") || "",
  };

  const parsed = staticPageIdSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultStaticPageIdErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { pageId } = parsed.data;

  const { data: page, error: fetchError } = await supabase
    .from("content_static_pages")
    .select("id, title, status")
    .eq("id", pageId)
    .single();

  if (fetchError || !page) {
    return {
      message: fetchError?.message || "Page not found.",
      errors: { ...defaultStaticPageIdErrors },
      values: raw,
      data: {},
    };
  }

  if (page.status === "archived") {
    return {
      message: "Page is already archived.",
      errors: {},
      values: {},
      data: { pageId },
    };
  }

  const { error: updateError } = await supabase
    .from("content_static_pages")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultStaticPageIdErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "archived_static_page",
    entity: "content_static_pages",
    targetId: pageId,
    details: `Archived static page ${pageId} (${page.title || ""})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "Page archived.",
    errors: {},
    values: {},
    data: { pageId },
  };
}

export async function deleteStaticPage(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultStaticPageIdErrors },
    };
  }

  const raw = {
    pageId: formData.get("pageId") || "",
  };

  const parsed = staticPageIdSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultStaticPageIdErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { pageId } = parsed.data;

  const { data: page, error: fetchError } = await supabase
    .from("content_static_pages")
    .select("id, title")
    .eq("id", pageId)
    .single();

  if (fetchError || !page) {
    return {
      message: fetchError?.message || "Page not found.",
      errors: { ...defaultStaticPageIdErrors },
      values: raw,
      data: {},
    };
  }

  const { error: deleteError } = await supabase
    .from("content_static_pages")
    .delete()
    .eq("id", pageId);

  if (deleteError) {
    return {
      message: deleteError.message,
      errors: { ...defaultStaticPageIdErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "deleted_static_page",
    entity: "content_static_pages",
    targetId: pageId,
    details: `Deleted static page ${pageId} (${page.title || ""})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "Page deleted.",
    errors: {},
    values: {},
    data: { pageId },
  };
}

// ARCHIVE & DELETE - EMAIL TEMPLATES

const defaultEmailTemplateIdErrors = {
  templateId: [],
};

const emailTemplateIdSchema = z.object({
  templateId: z.string().uuid({ message: "Invalid template" }),
});

export async function archiveEmailTemplate(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultEmailTemplateIdErrors },
    };
  }

  const raw = {
    templateId: formData.get("templateId") || "",
  };

  const parsed = emailTemplateIdSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultEmailTemplateIdErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { templateId } = parsed.data;

  const { data: template, error: fetchError } = await supabase
    .from("content_email_templates")
    .select("id, name, status")
    .eq("id", templateId)
    .single();

  if (fetchError || !template) {
    return {
      message: fetchError?.message || "Template not found.",
      errors: { ...defaultEmailTemplateIdErrors },
      values: raw,
      data: {},
    };
  }

  if ((template.status || "").toLowerCase() === "inactive") {
    return {
      message: "Template is already inactive.",
      errors: {},
      values: {},
      data: { templateId },
    };
  }

  const { error: updateError } = await supabase
    .from("content_email_templates")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultEmailTemplateIdErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "archived_email_template",
    entity: "content_email_templates",
    targetId: templateId,
    details: `Archived email template ${templateId} (${template.name || ""})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "Template archived (set to inactive).",
    errors: {},
    values: {},
    data: { templateId },
  };
}

export async function deleteEmailTemplate(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultEmailTemplateIdErrors },
    };
  }

  const raw = {
    templateId: formData.get("templateId") || "",
  };

  const parsed = emailTemplateIdSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultEmailTemplateIdErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { templateId } = parsed.data;

  const { data: template, error: fetchError } = await supabase
    .from("content_email_templates")
    .select("id, name")
    .eq("id", templateId)
    .single();

  if (fetchError || !template) {
    return {
      message: fetchError?.message || "Template not found.",
      errors: { ...defaultEmailTemplateIdErrors },
      values: raw,
      data: {},
    };
  }

  const { error: deleteError } = await supabase
    .from("content_email_templates")
    .delete()
    .eq("id", templateId);

  if (deleteError) {
    return {
      message: deleteError.message,
      errors: { ...defaultEmailTemplateIdErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "deleted_email_template",
    entity: "content_email_templates",
    targetId: templateId,
    details: `Deleted email template ${templateId} (${template.name || ""})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "Template deleted.",
    errors: {},
    values: {},
    data: { templateId },
  };
}

// ARCHIVE & DELETE - FAQS

const defaultFaqIdErrors = {
  faqId: [],
};

const faqIdSchema = z.object({
  faqId: z.string().uuid({ message: "Invalid FAQ" }),
});

export async function archiveFaq(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultFaqIdErrors },
    };
  }

  const raw = {
    faqId: formData.get("faqId") || "",
  };

  const parsed = faqIdSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultFaqIdErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { faqId } = parsed.data;

  const { data: faq, error: fetchError } = await supabase
    .from("content_faqs")
    .select("id, question, visibility")
    .eq("id", faqId)
    .single();

  if (fetchError || !faq) {
    return {
      message: fetchError?.message || "FAQ not found.",
      errors: { ...defaultFaqIdErrors },
      values: raw,
      data: {},
    };
  }

  if ((faq.visibility || "").toLowerCase() === "internal") {
    return {
      message: "FAQ is already archived (internal).",
      errors: {},
      values: {},
      data: { faqId },
    };
  }

  const { error: updateError } = await supabase
    .from("content_faqs")
    .update({
      visibility: "internal",
      updated_at: new Date().toISOString(),
    })
    .eq("id", faqId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultFaqIdErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "archived_faq",
    entity: "content_faqs",
    targetId: faqId,
    details: `Archived FAQ ${faqId} (${faq.question || ""})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "FAQ archived (set to internal).",
    errors: {},
    values: {},
    data: { faqId },
  };
}

export async function deleteFaq(prevState, formData) {
  const supabase = await createClient();
  const { user, currentProfile, errorResponse } = await getCurrentAdmin(supabase);

  if (!user || !currentProfile) {
    return {
      ...(errorResponse || {}),
      errors: { ...defaultFaqIdErrors },
    };
  }

  const raw = {
    faqId: formData.get("faqId") || "",
  };

  const parsed = faqIdSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultFaqIdErrors, ...fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { faqId } = parsed.data;

  const { data: faq, error: fetchError } = await supabase
    .from("content_faqs")
    .select("id, question")
    .eq("id", faqId)
    .single();

  if (fetchError || !faq) {
    return {
      message: fetchError?.message || "FAQ not found.",
      errors: { ...defaultFaqIdErrors },
      values: raw,
      data: {},
    };
  }

  const { error: deleteError } = await supabase
    .from("content_faqs")
    .delete()
    .eq("id", faqId);

  if (deleteError) {
    return {
      message: deleteError.message,
      errors: { ...defaultFaqIdErrors },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id || user.id,
    adminRole: currentProfile.role || null,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "deleted_faq",
    entity: "content_faqs",
    targetId: faqId,
    details: `Deleted FAQ ${faqId} (${faq.question || ""})`,
  });

  revalidatePath("/dashboard/admin/content_policy_pages");
  revalidatePath("/dashboard/admin");

  return {
    message: "FAQ deleted.",
    errors: {},
    values: {},
    data: { faqId },
  };
}
