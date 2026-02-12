Feature A-1 — Admin Dashboard Overview

Feature Purpose

The Admin Dashboard provides centralized oversight of all platform activities — registries, vendors, orders, payments, users, and support tickets.
It serves as the home base for all admin-role users (Super Admin, Finance,  Operations Manager, Customer Support, etc.), showing platform performance metrics, key alerts, and quick navigation to management modules.



User Roles with Access







Role



Access Level





Super Admin



Full access to all data, settings, staff roles, and reports





Operations  Manager



Access to products, vendors, and registries





Finance



Access to orders, transactions, and payouts





Customer Support



Access to tickets, escalations, and user issues



Dashboard Content Areas 

1. Top-Level KPIs (Visible to All Roles)

Displayed as quick stats at the top of the dashboard.







Metric



Description



Data Source





Active Registries



Total number of active user registries



registries.status = active





Pending Vendor Requests



Vendor applications awaiting approval



vendors.status = pending





Total Orders



All orders processed on the platform



orders.count()





Open Tickets



Active customer support tickets



support_tickets.status = open





Pending Escalations



Support tickets awaiting higher-level review



support_tickets.status = escalation



2. Action Cards / Quick Links

Each card opens a specific admin module (for routing, not design).







Card



Action



Endpoint/Route



Access





Manage Roles



Create, assign, or revoke staff roles and permissions



/admin/roles



Super Admin





Open Registry List



View and manage all registries on the platform



/admin/registries



Product Manager, Super Admin





View Requests (Vendor Approvals)



Approve or reject vendor applications



/admin/vendors



Product Manager, Super Admin





View Transactions



Review order payments and purchase history



/admin/orders



Finance, Super Admin





View Payouts (Approve Payouts)



Verify fulfillment and release vendor payments



/admin/payouts



Finance





Manage Support Tickets



Assign, escalate, or close support tickets



/admin/support



Customer Support





Generate Reports



Export summary reports (PDF/CSV)



/admin/reports



All roles (data limited by access)



3. Search & Filtering Section

A universal search bar allows admins to quickly locate registries, users, vendors, or orders.





Input: search_query



Filters: entity_type (user, vendor, registry, order), status, date range



Endpoint: GET /api/admin/search?query=&type=&status=&date_from=&date_to=



4. Performance Snapshot Section

Summarizes daily or weekly performance using small metric widgets.







Metric



Description



Example





Total Purchases (This Week)



Aggregate order amount (GHS)



GHS 150,000,000





Vendor Payouts (This Week)



Amount disbursed to vendors



GHS 560,000





Top Performing Vendor



Vendor with highest sales volume



“Eya Naturals”





Most Popular Registry Category



Registry type with highest activity



“Wedding Registries”

Backend endpoint:
GET /api/admin/summary-metrics?range=weekly



5. Role-Based Panels

 Super Admin View





Access to all cards and KPIs



Can create new staff accounts (POST /api/admin/users)



Can assign or revoke permissions (PATCH /api/admin/users/:id/role)



Can suspend or activate admin accounts

Operations Manager View





Quick access to vendor applications, registries, and product approval queue



Receives notifications for new vendor submissions or product changes

Finance View





Displays recent transactions, pending payouts, and refund requests



Approve or decline payout (POST /api/admin/payouts/:id/approve)



Download CSV reports of orders

 Customer Support View





Displays open tickets, escalations, and resolved cases count



“Receive Support Ticket” button → /admin/support/new



“Close Ticket” button → /admin/support/:id/close



Search and filter by customer email, registry, or order number



Backend Architecture

Tables Involved







Table



Key Fields



Notes





users



id, name, email, role, status



Used for admin and customer tracking





vendors



id, store_name, status



For vendor stats





registries



id, name, type, status



For active registry count





orders



id, amount, status, date_created



For transaction summaries





support_tickets



id, subject, status, priority, assigned_to



For support analytics





payouts



id, vendor_id, amount, status



For vendor payment approvals



Primary Endpoints







Endpoint



Method



Description





/api/admin/dashboard/summary



GET



Returns all KPI stats and financial metrics





/api/admin/registries



GET



Returns all registries (for registry oversight)





/api/admin/vendors



GET



Vendor stats for pending and approved





/api/admin/orders



GET



All order stats and fulfillment progress





/api/admin/payouts



GET



Pending and approved payout summaries





/api/admin/support



GET



Support ticket analytics (open, resolved, escalations)

 Rules & Behavior





Each metric dynamically updates from live data (no hardcoded counts).



Role-based visibility enforced by JWT claims.



Finance totals use GHS currency formatting.



Pagination default = 20 items per table.



Admin logs (actions, approvals, suspensions) stored in admin_activity_log.



Dashboard refresh interval = 60 seconds (configurable).



🔗Cross-Module Links







Linked Module



Purpose





A-2 User & Role Management



Adds/removes staff visible in “Manage Roles”





A-3 Vendor Management



Feeds “Pending Vendor Requests” stat





A-5 Registry Oversight



Feeds “Active Registries” stat





A-6 Order & Transaction Management



Feeds “Total Orders” and “Payouts”





A-7 Customer Support & Escalations



Feeds “Open Tickets” and “Pending Escalations”



Email & Notification Triggers







Event



Recipient



Action





New vendor application



Ops Manager



Notification card on dashboard





Registry flagged



Super Admin



Alert in top banner





Support ticket escalated



Customer Support Lead



Email + dashboard counter update





Payout ready for approval



Finance team



Notification + “Approve Payouts” badge increment





Feature A-2 — User & Role Management



Feature Purpose

This feature allows Super Admins to create, edit, and manage internal staff accounts (Admin roles), and define what each role can access across the platform.
It also allows selective visibility — ensuring Finance, Support, and Product roles only access relevant modules.

It underpins role-based access control (RBAC) and ensures all staff actions are logged and traceable.



User Roles with Access







Role



Access Level





Super Admin



Full CRUD access to staff users and roles





HR/Operations (optional)



Add new users, assign roles (without editing permissions)





Other Admin Roles



View-only access to staff list (cannot modify roles or users)



Core Components

1. Staff List Table (Main View)

A paginated list showing all staff users on the platform.

Table Columns:







Field



Description



Data Type / Source





Name



Full name of staff



users.name





Email Address



Login email



users.email





Role



Assigned system role (e.g. Super Admin, Finance, Operations Manager)



users.role





Status



Active / Suspended / Pending



users.status





Last Login



Timestamp of last platform access



users.last_login





Created By



Which admin created the account



users.created_by





Actions



Buttons: Edit, Suspend, Activate, Delete



—



2. Actions Available







Action



Description



API Endpoint



Role Access





Add New Staff



Opens staff creation modal



POST /api/admin/users



Super Admin





Edit Staff Details



Modify user name, role, or email



PATCH /api/admin/users/:id



Super Admin





Suspend Account



Temporarily block access



PATCH /api/admin/users/:id/suspend



Super Admin





Activate Account



Reinstate a suspended account



PATCH /api/admin/users/:id/activate



Super Admin





Delete Account



Permanently remove user record



DELETE /api/admin/users/:id



Super Admin



3. Add New Staff (Modal / Form)







Field



Field Type



Validation



Notes





Full Name



Text



Required



—





Email Address



Email



Required, unique



Used as login credential





Phone Number



Number



Optional



For internal contact





Password



Auto-generated (visible on success toast)



—



System generates random 8-char password; sent via email





Assign Role



Dropdown (options: Super Admin, Operations Manager, Finance, Support)



Required



Determines access





Permissions Preview



Dynamic view



—



Shows accessible modules based on selected role

UI Behavior:





“Create Staff” button submits to backend and triggers:





Email notification to new staff with login credentials.



Entry creation in admin_activity_log.



Password reset link included in onboarding email.



4. Role & Permission Management

Available System Roles







Role



Description



Access Scope





Super Admin



Full system access



All modules, settings, users





Operations Manager



Manages vendors, products, and registries



/admin/vendors, /admin/registries, /admin/products





Finance



Handles payments, payouts, and reports



/admin/orders, /admin/payouts, /admin/reports





Customer Support



Manages tickets and user issues



/admin/support





Ops/HR (Optional)



Adds staff and manages internal workflow



/admin/users (restricted edit/delete)

Permissions Matrix Example







Module



Super Admin



Operations Manager



Finance



Support





Dashboard



✅



✅



✅



✅





Vendors



✅



✅



❌



❌





Products



✅



✅



❌



❌





Orders



✅



✅



✅



❌





Payouts



✅



❌



✅



❌





Support Tickets



✅



❌



❌



✅





Reports



✅



✅



✅



❌





User Management



✅



❌



❌



❌



5. Account Suspension / Activation Flow

Trigger: Admin clicks “Suspend” or “Activate” button.
Behavior:





Confirms action via modal: “Are you sure you want to suspend this account?”



Backend updates users.status.



Affected user receives an email alert:





Subject: “Your Giftologi Admin Account Has Been Suspended”



Body: Explains reason (optional), reinstatement conditions.

Backend Endpoint:
PATCH /api/admin/users/:id/status

Log Entry Example:
{ "user_id": 12, "action": "suspend", "performed_by": 1, "timestamp": "2025-10-08T10:00Z" }



6. Audit Logs

Every role or user action generates a system log entry in admin_activity_log:







Field



Description





user_id



Staff performing action





action



e.g. “create_user”, “update_role”





target_user



Affected account





timestamp



DateTime





details



JSON object summarizing change

Endpoint:
GET /api/admin/activity-log

7. Security & Access Rules





Unique email required for all staff.



Role-based token validation on every request.



Suspended users immediately lose session validity.



Passwords hashed using bcrypt before saving.



Logs cannot be deleted from the interface (only archived).



8. Email & Notification Triggers







Event



Recipient



Notification





Staff account created



New staff



Email with login credentials





Role changed



Affected staff



Email + in-app banner: “Your role has been updated to [Role Name]”





Account suspended



Affected staff



Email + reason





Account activated



Affected staff



Email + “Welcome back” message





New activity log entry



Super Admin



Internal dashboard notification





Feature A-3 — Product Oversight & Approval Queue



Feature Purpose

This feature gives Admins and Operations Managers a centralized system to review, approve, edit, or reject all products uploaded by vendors before they become visible on the Giftologi storefront or registry. 

It ensures that every listed product meets brand, quality, and content standards — while keeping a traceable record of all moderation actions.

It also connects directly with Vendor Management and Registry Oversight for end-to-end operational visibility.



User Roles with Access







Role



Access Level





Super Admin



Full control: approve, reject, delete, edit products





Operations Manager



Can review and approve/reject product submissions





Finance Admin



Read-only access to product pricing and vendor payout linkage





Customer Support



Read-only access for issue resolution





Vendor (Limited)



Can view only their own products and statuses (via Vendor Dashboard)



Core Components

1. Product Approval Queue (Main View)

A paginated list of all unapproved, flagged, or pending review products submitted by vendors.

Table Columns:







Field



Description



Source





Product Name



Submitted name of product



products.name





Vendor Name



Vendor who submitted the product



vendors.display_name





Category



Product category assigned



categories.name





Price



Current listed price



products.price





Stock Quantity



Available units



products.stock





Submission Date



Date product was uploaded



products.created_at





Status



Pending / Approved / Rejected / Flagged



products.status





Action Buttons



View, Approve, Reject, Edit, Delete



—



2. Product Review Modal (Quick View)

When an admin clicks “View” on a product, a full detail modal or page opens showing:







Section



Fields





Basic Info



Product name, price, SKU, category





Vendor Info



Vendor name, email, store name, verification status





Product Media



Uploaded images, thumbnails, video (if any)





Description & Specs



Full text description, highlights, dimensions, materials





Inventory Details



Available stock





Shipping Details



Weight, origin location, shipping methods





Compliance Check



Checklist for admin (✅ Complete, ⚠ Missing info)



3. Approval & Rejection Flow







Action



Description



Backend Endpoint





Approve Product



Adds service charge and Marks product as approved and visible to customers



PATCH /api/admin/products/:id/approve





Reject Product



Marks product as rejected and returns reason to vendor



PATCH /api/admin/products/:id/reject





Edit Product Before Approval



Admin modifies details directly (price, description, media)



PATCH /api/admin/products/:id/edit





Flag Product



Temporarily hides from storefront due to complaint or issue



PATCH /api/admin/products/:id/flag

Approval Confirmation Modal:





Service charge input field



“Approve this product for listing?”



On confirm → success message: “Product approved and published to shop.”

Rejection Flow:





Admin provides a required rejection reason (dropdown + optional text).



Automated email sent to vendor.

Example Reasons:





Incomplete description



Poor image quality



Incorrect category



Duplicate listing



Price mismatch or policy violation



4. Flagged Product Management

Admins can view and resolve flagged products ( manually flagged by customers/vendors).







Field



Description





Flag Type



e.g., “Customer complaint,” “Duplicate”





Reported By



Source user





Resolution Notes



Internal notes by admin





Status



Active flag / Resolved

Endpoint:
PATCH /api/admin/products/:id/resolve-flag



5. Bulk Actions

Admins can perform actions on multiple products simultaneously.







Action



Description





Bulk Approve



Approve multiple selected products





Bulk Reject



Reject multiple with shared reason





Bulk Flag



Mark multiple products for review

Endpoint Example:
POST /api/admin/products/bulk-update



6. Search & Filter Controls

Filter and search across multiple parameters for efficient moderation.







Filter



Options





Status



Pending, Approved, Rejected, Flagged





Vendor



Dropdown list of all vendors





Category



Product categories





Submission Date



Date range picker





Price Range



Slider input





Stock Level



Low stock alerts



7. Product Audit Trail

Each moderation action is logged for accountability.







Field



Description





product_id



Product affected





action



approve/reject/edit/delete





performed_by



Admin ID





timestamp



DateTime





notes



Optional reason or context

Endpoint:
GET /api/admin/products/:id/audit-trail



8. Automated Notifications







Event



Recipient



Notification Type





Product approved



Vendor



Email + in-dashboard alert





Product rejected



Vendor



Email with rejection reason





Product flagged



Super Admin



Internal notification





Product edited by admin



Vendor



Email alert with summary of edits





Bulk approvals



Product Manager



Confirmation alert



9. Data & Backend Model







Table



Key Fields



Notes





products



id, vendor_id, name, price, description, stock, category_id, status



Primary product data





product_reviews



product_id, admin_id, notes, status, service charge, reason



Stores approval/rejection history





product_flags



product_id, flagged_by, reason, status



Stores flagged product data





product_audit_log



product_id, admin_id, action, timestamp



Used for compliance tracking



10. Security & Validation





Only users with role = operations_manager or super_admin can modify products.



Vendors can edit unapproved products but cannot resubmit once rejected — must duplicate or contact admin.



Image uploads scanned for file type, size, and malware (via internal validator or third-party API).



All approval actions double-confirmed with modals.





Feature A-4 — Registry Oversight & Management



Feature Purpose

This feature enables Admins and Operations Managers to monitor, audit, and manage all event registries created by hosts. It provides full visibility into each registry’s setup, item list, and purchase activity — ensuring platform quality, compliance, and operational control.

It consolidates all registry-related functions: view, edit, deactivate, flag, and delete.



User Roles with Access







Role



Access Level





Super Admin



Full control – can view, edit, deactivate, or delete any registry





Operations Manager



Can view and edit registries, cannot delete





Finance Admin



Read-only access for financial linkage and payout validation





Customer Support



Can view registries to assist users, but cannot edit or delete





Vendor



No access; can only view registry-linked orders from their own dashboard



Core Components

1️⃣ Registry Overview (Main View)

A searchable, filterable table view showing all active and archived registries.

Columns







Field



Description





Registry Name



Title chosen by host





Host Name



Host’s full name





Event Type



Wedding, Baby Shower, Birthday, etc.





Event Date



Date of the event





Status



Active • Expired • Hidden • Flagged





Total Items



Total number of items





Purchased Items



Items marked as purchased





Total Value (GHS)



Estimated total cost





Action



View • Edit • Deactivate • Delete

Search & Filters





Search by host name, registry name, or event code



Filter by status, event type, or date range



Sorting by event date or number of purchases

Endpoint
GET /api/admin/registries?status=&event_type=&date_range=&host_name=





2️⃣ Registry Detail Page

When an admin selects View, they see a detailed, tabbed registry view:

Registry Info





Registry title



Event type



Event date and location



Registry URL / code



Privacy: Public / Private / Invite-only

Host Info





Host name and contact email



Account type (individual / organization)



Registry creation date



Last updated timestamp

Registry Items Table







Field



Description





Product Name



Linked to product ID





Vendor



Vendor name





Price



Product price (GHS)





Quantity Desired



Host target





Quantity Purchased



Guest contributions





Priority



High • Medium • Low





Product Status



Active • Unavailable • Hidden





Purchased By



Guest name or “Anonymous”

Guest Activity Snapshot





Number of page visits



Number of purchases



Most viewed product



Last purchase date

Fulfillment Summary





Linked orders



Delivery status (pending / shipped / delivered)



Vendor payout status



Admin Actions







Action



Description



Endpoint





Approve Registry



Approve registry if it requires manual moderation



PATCH /api/admin/registries/:id/approve





Deactivate Registry



Temporarily hides registry from public view



PATCH /api/admin/registries/:id/deactivate





Delete Registry



Permanently removes registry and all associated data



DELETE /api/admin/registries/:id





Edit Registry Info



Update title, event date, or privacy settings



PATCH /api/admin/registries/:id/edit





Flag Registry



Mark for internal review (duplicate, suspicious content)



PATCH /api/admin/registries/:id/flag





Export Data



Export registry and purchase summary to CSV



GET /api/admin/registries/:id/export



Filters & Search

Admins can refine results using:





Registry name / host name



Event type



Status (Active, Hidden, Flagged, Expired)



Event date range



Purchase completion rate



Expiration & Archival Logic





Registries automatically change to Expired status once the event date passes.



Expired registries are viewable in read-only mode.



Admins can manually Archive expired registries.



Archived registries are retained for 12 months before automatic deletion.

Endpoint:
PATCH /api/admin/registries/:id/archive



Registry Flagging & Review

A queue for registries flagged by users or internal moderation tools.







Field



Description





Registry ID



The flagged registry





Reason



Inappropriate content, duplicate, suspicious behavior





Reported By



User ID or system





Resolution Notes



Added by admin





Status



Pending • Resolved

Endpoint:
PATCH /api/admin/registries/:id/resolve-flag





Notifications & Automation







Trigger



Recipient



Type





Registry created



Admin



Dashboard alert or email





Registry flagged



Super Admin



Dashboard + email





Registry deactivated



Host



Email with reason





Registry expired



Host



Auto email reminder 7 days before expiration





Registry deleted



Host



Email confirmation with permanent deletion notice

Sample Host Email (Expiration)



Subject: Your Gift Registry Has Expired

Hi [Host Name],
Your registry for [Event Name] has expired. You can still view it and send thank-you messages, but new purchases are now disabled.



Audit Trail

All registry-related admin actions are logged.







Field



Description





Registry ID



ID of affected registry





Action



approve • edit • deactivate • delete





Performed By



Admin ID





Timestamp



Date & Time





Notes



Optional reason

Endpoint:
GET /api/admin/registries/:id/audit-trail



Data Model Overview







Table



Key Fields



Notes





registries



id, user_id, name, event_type, event_date, privacy, status



Core registry data





registry_items



registry_id, product_id, qty_desired, qty_purchased, priority



Registry items





registry_flags



registry_id, reason, reported_by, status



Moderation tracking





registry_audit_log



registry_id, admin_id, action, timestamp, notes



Audit history



Security & Validation





Only super_admin or operations_manager can edit or delete registries.



Read-only access for finance_admin and customer_support.



All deletions require double confirmation and soft delete before permanent removal.



All registry ownership validated before modification.



Audit logs stored for 12 months minimum.



 Feature A-5 — Transaction & Payout Oversight



Feature Purpose

This feature gives Admins and Finance Teams end-to-end visibility and control over all orders, payments, refunds, and vendor payouts processed through the Giftologi platform.
It ensures that every transaction from purchase to delivery is transparent, reconciled, and properly linked to registry and vendor data.



User Roles with Access







Role



Access Level





Super Admin



Full access – can view, approve, and reverse transactions or payouts





Finance Admin



Full access to payment records and vendor payouts





Customer Support



View-only access to assist users with purchase inquiries





Operations Manager



Read-only access for performance analysis





Vendor



View transactions related to their own store only (through Vendor Dashboard)



Core Components

1️⃣ Transaction Dashboard (Main Overview)

A comprehensive list of all orders placed on the platform — including registry-linked and non-registry orders.

Columns







Field



Description





Order ID



Unique order number (auto-generated)





Registry ID



Linked registry (if applicable)





Guest Name



Purchaser’s name





Vendor



Vendor fulfilling order





Payment Method



MoMo, Card, or Bank Transfer





Amount (GHS)



Total amount paid





Status



Pending • Paid • Refunded • Disputed • Completed





Delivery Status



Pending • Shipped • Delivered





Date



Transaction date





Action



View • Refund • Flag • Delete

Search & Filters





Search by Order ID, guest name, registry name, or vendor



Filter by payment status, vendor, date range, or registry



Sorting by date or amount

Endpoint:
GET /api/admin/transactions?status=&vendor_id=&date_range=&registry_id=



2️⃣ Transaction Detail Page

When an admin clicks View, they can access full transaction metadata.

Payment Summary







Field



Description





Transaction ID



Payment gateway reference





Payment Provider



ExpressPay





Payment Method



MTN MoMo, Telecel Cash, Visa, Mastercard, etc.





Payment Status



Pending / Paid / Failed / Refunded





Payment Date



Timestamp





Amount Paid



Amount including service fee





Service Fee



Added per product on approval





Net Vendor Amount



After service charge











API Interaction





Initialization: /api/payments/initialize → calls external payment gateway



Verification: /api/payments/verify/:reference → confirms success



Webhook Handler: /api/payments/webhook → updates transaction status on callback



3️⃣ Delivery & Fulfillment Tab

Tracks post-purchase logistics for each order.







Field



Description





Courier Partner



Selected shipping provider





Tracking ID



Reference number





Inbound Shipping Fee



Fixed charge of 25ghc per vendor in a registry





Outbound Shipping Fee



Calculated via logistics API 





Gift Wrapping 



Applied (Yes/No)





Gift Wrapping Option



Options Created by Super Admin/Operations Manager





Gift Wrapping Fee



Based on Gift Wrapping Option selected





Delivery Status



Pending / Dispatched / Delivered / Failed





Proof of Delivery



Upload field for delivery confirmation





Remarks



Admin or logistics notes

Endpoints





PATCH /api/admin/orders/:id/update-status



POST /api/admin/orders/:id/upload-proof

External API





Shipping cost calculation through logistics provider (e.g., POST /external/shipping/cost)



Refund & Dispute Management

Allows admins to manually or automatically issue refunds for failed or disputed transactions.







Action



Description





Initiate Refund



Start refund via payment gateway





Approve Refund



Approve after verification





Reject Refund



Reject with reason





Add Note



Add internal comment

Endpoints





POST /api/admin/transactions/:id/refund



PATCH /api/admin/transactions/:id/update-refund-status

Refund Flow





Admin clicks “Initiate Refund”



System verifies eligibility (payment_status=Paid, delivery_status != Delivered)



Refund initiated through payment gateway API



Confirmation received via webhook



Admin updates refund record and closes dispute





Vendor Payout Management

Handles the payout process after successful deliveries.







Field



Description





Vendor Name



Vendor receiving payout





Total Sales



All confirmed delivered orders





Pending Payout (GHS)



Amount awaiting approval





Payout Method



Bank transfer / MoMo





Payout Status



Pending • Approved • Completed





Date Approved



Timestamp

Endpoints





GET /api/admin/payouts?vendor_id=&status=



PATCH /api/admin/payouts/:id/approve



PATCH /api/admin/payouts/:id/complete

Payout Rules





Only Delivered orders count toward payout eligibility



Payouts processed weekly or monthly (configurable in admin settings)



Payout summary downloadable as CSV







Dispute Resolution Queue

Centralized queue for handling complaints from guests or vendors.







Field



Description





Ticket ID



Complaint reference





Type



Payment / Delivery / Product issue





Raised By



Guest or vendor name





Description



Summary of issue





Status



Pending • Under Review • Resolved





Resolution Notes



Admin comments





Linked Order ID



Connection to original order

Endpoints





GET /api/admin/disputes



PATCH /api/admin/disputes/:id/update-status







Notifications & Automation







Trigger



Recipient



Notification





Payment received



Admin, Vendor



“New purchase confirmed”





Payment failed



Admin



Alert via dashboard





Refund processed



Guest



Email confirmation





Payout approved



Vendor



Email + dashboard notification





Delivery confirmed



Guest



“Your gift has been delivered”

Sample Vendor Email (Payout Confirmation)



Subject: Your Vendor Payout Has Been Approved

Hello [Vendor Name],
Your payout of GHS [amount] for completed orders has been approved and will reflect in your [MoMo/Bank] account within 48 hours.



Audit Trail

All financial actions are recorded for compliance and transparency.







Field



Description





Transaction ID



Related order





Action



approve • refund • payout





Performed By



Admin ID





Timestamp



Date & Time





Notes



Optional comment

Endpoint:
GET /api/admin/transactions/:id/audit-trail



Data Model Overview







Table



Key Fields



Notes





transactions



id, user_id, vendor_id, amount, status, payment_method



Core transaction data





orders



transaction_id, registry_id, delivery_status, proof_of_delivery



Linked order fulfillment





payouts



vendor_id, amount, status, approved_by



Vendor payment management





refunds



transaction_id, reason, status, processed_by



Refund log





disputes



order_id, raised_by, description, resolution



Dispute tracking



Security & Validation





Payment gateway responses verified using signature validation.



Refunds and payouts require dual approval (Finance + Super Admin).



Access to finance data limited to authorized roles only.



All payout exports encrypted before storage.



Audit logs retained for at least 18 months.



 Feature A-6 — Customer Support & Ticket Escalation System



Feature Purpose

This module provides a centralized system for admins and support staff to manage user complaints, technical issues, and vendor/guest inquiries.
It ensures that every issue raised — whether through email, the contact form, or the dashboard — is tracked, categorized, assigned, and resolved efficiently, maintaining user trust and platform reliability.



User Roles with Access







Role



Access Level





Super Admin



Full visibility and override control; can assign, close, or reopen tickets.





Support Admin



Create, manage, and resolve tickets; communicate with users.





Vendor



View and respond to tickets related to their store or orders.





Registry Host



Can view or raise tickets for their orders, registries, or account issues.





Guest User



Can raise tickets for purchases or delivery concerns via the public contact form.



Core Components

Support Dashboard (Overview)

A unified interface displaying all open, pending, or resolved tickets.

Columns







Field



Description





Ticket ID



Unique identifier (auto-generated, e.g., TKT-10045)





Category



Account Issue • Payment • Delivery • Registry • Product • Technical





User Name / Role



Guest, Vendor, or Host





Priority



Low • Medium • High • Critical





Status



New • In Progress • Waiting on User • Escalated • Resolved • Closed





Assigned To



Support team member name





Created At



Date and time created





Last Updated



Timestamp for tracking responsiveness





Action



View • Assign • Escalate • Close

Filters & Search





Filter by status, category, assigned staff, date range, or role



Keyword search across ticket titles and descriptions

Endpoint:
GET /api/admin/support/tickets?status=&category=&priority=&assigned_to=&role=





Ticket Detail Page

When a ticket is opened, the admin/support agent can view and interact with all relevant details.

Sections:

🧾 Ticket Summary







Field



Description





Ticket ID



Auto-generated unique code





Raised By



User name + role (Guest, Vendor, or Host)





Email



User contact email





Linked Order ID



Optional (if related to an order)





Linked Registry ID



Optional (if registry-related)





Category



Complaint type





Description



Full message submitted by user





Attachments



Images or screenshots





Priority



System-assigned or manually updated

Endpoint:
GET /api/admin/support/tickets/:id



Endpoints





POST /api/admin/support/tickets/:id/reply



POST /api/admin/support/tickets/:id/add-note



PATCH /api/admin/support/tickets/:id/update-status

System Behavior





When admin replies → email + in-dashboard notification sent to user



Internal notes are stored but not sent to user





 Ticket Creation Points

Tickets can be created in 3 ways:







Source



Trigger



Flow





Contact Page Form



Guest submits complaint/inquiry



Public ticket auto-created under “General” category





User Dashboard (Host/Vendor)



User clicks “Get Help”



Prefilled with user + order/registry context





Admin Panel (Manual)



Support team logs issue manually



Useful for recorded phone/email issues

Endpoint:
POST /api/support/tickets/create

Required Fields





Name



Email



Category (dropdown)



Description (textarea, max 1,000 chars)



Attachment (optional)





Ticket Assignment & Escalation

Assignment





Admin or Support Lead can assign tickets to specific team members



Auto-notification sent to assignee



SLA timer starts counting once assigned

Escalation Flow





Ticket flagged as “High” or “Critical”



Admin clicks Escalate



System duplicates the ticket under “Escalation Queue” with audit link



Escalation email sent to Super Admin and relevant department lead

Endpoints





PATCH /api/admin/support/tickets/:id/assign



PATCH /api/admin/support/tickets/:id/escalate



5️⃣ Resolution & Closure







Action



Description





Resolve Ticket



Marks as resolved and prompts for internal notes





Reopen Ticket



Available if the user is unsatisfied with resolution





Close Ticket



Marks ticket as permanently closed (cannot be reopened)



Endpoint:
PATCH /api/admin/support/tickets/:id/close



6️⃣ Support Analytics & Reports

Generates metrics for performance evaluation and SLA compliance.







Metric



Description





Total Tickets



All tickets logged in a time period





Average Resolution Time



Time from creation to closure





SLA Compliance



% of tickets resolved within SLA limit





Tickets by Category



Payment, Delivery, Product, etc.





Tickets by Role



Guest, Host, Vendor





Escalation Rate



% of tickets escalated





Resolution Satisfaction



Based on user rating (if enabled post-resolution)

Endpoints





GET /api/admin/support/analytics?date_range=&category=&role=







Notifications & Automation







Trigger



Recipient



Notification





New ticket created



Support Admin



“New ticket #TKT-xxxx created”





Ticket assigned



Assigned agent



“A new ticket has been assigned to you”





Ticket replied



User



“You have a new message from Giftologi Support”





Ticket escalated



Super Admin



“Ticket #TKT-xxxx has been escalated”





Ticket closed



User



“Your support ticket has been closed”



Audit Trail







Field



Description





Ticket ID



Related ticket reference





Action



Assign • Escalate • Resolve • Close





Performed By



Admin or support agent





Timestamp



Date & time





Notes



Internal record of decision



Data Model Overview







Table



Key Fields



Notes





tickets



id, user_id, category, description, status, priority



Core ticket data





ticket_assignments



ticket_id, admin_id, assigned_at



Assignment tracking





ticket_audit_logs



ticket_id, action, performed_by, notes



Activity tracking



Security & Validation





Only assigned agents can modify or close tickets.



Sensitive data (payment references, addresses) hidden.



All communications logged in the database for auditability.



Attachments virus-scanned before upload.



Feature A-7 — Analytics & Reporting



Feature Purpose

The Analytics & Reporting module empowers administrators and key managers to track platform performance across registries, vendors, sales, and user engagement.
It provides actionable insights to guide business decisions, improve operations, and monitor the health of the Giftologi ecosystem.



User Roles with Access







Role



Access Level





Super Admin



Full visibility into all system analytics and downloadable reports.





Finance Admin



Access to financial reports, payouts, and service charge data.





Product Admin



Access to vendor/product analytics and registry trends.





Support Admin



Can view customer engagement metrics, ticket analytics.



Core Components

Analytics Dashboard (Overview)

A visual summary of platform activity with filterable charts and KPIs.

Displayed Metrics







KPI



Description





Total Users



Number of all active users (Hosts, Vendors, Guests)





Active Registries



Number of ongoing or active gift registries





Total Gifts Purchased



Number of completed purchases from registries





Revenue Generated



Total GHS value of transactions (minus refunds)





Service Charges Earned



Sum of Giftologi’s service fees applied per item





Vendor Count



Total active, pending, and suspended vendors





Pending Approvals



Products, vendors, or registries awaiting admin action





Support Tickets (Open)



Number of unresolved tickets in support queue

Filters





Date Range (Today, Last 7 Days, 30 Days, Custom)



Category (User, Vendor, Product, Registry, Financial)



Endpoints





GET /api/admin/analytics/overview?date_range=&category=



GET /api/admin/analytics/summary-metrics





Financial Reports

Detailed view of income, service charges, vendor payouts, and refunds.

Sections







Field



Description





Total Sales (GHS)



All confirmed payments





Service Charges (GHS)



Calculated per-item fees retained by Giftologi





Pending Vendor Payouts



Amount due for settlement





Completed Payouts



Track history of released funds





Refunds / Adjustments



Record of manual and automatic refunds

Export Options





CSV



PDF



XLSX

Endpoints





GET /api/admin/reports/financial?date_range=



GET /api/admin/reports/payouts?status=



GET /api/admin/reports/refunds





Vendor & Product Analytics

Insights into vendor performance, product popularity, and sales distribution.

Metrics







Metric



Description





Top Performing Vendors



Based on completed sales volume





Top Selling Products



Highest number of purchases or additions to registries





Most Viewed Products



Product page views (from frontend activity tracking)





Product Approval Queue



Count of pending vendor submissions





Low Inventory Alerts



Products nearing out-of-stock threshold





Inactive Vendors



Vendors without sales activity in X days

Endpoints





GET /api/admin/analytics/vendors?sort=sales



GET /api/admin/analytics/products?sort=views



GET /api/admin/analytics/low-stock





Registry & User Behavior Analytics

Tracks user engagement across registry creation, sharing, and gift fulfillment.



Key Metrics







Metric



Description





Registries Created



Total number of registries created by hosts





Active vs. Completed Registries



Lifecycle stats





Average Gifts per Registry



Gauge of registry engagement





Most Popular Registry Types



Weddings, Baby Showers, Birthdays, etc.





Top Shared Registries



Based on link share count





Gift Fulfillment Rate



% of registry items purchased or reserved





User Growth Rate



Month-over-month growth of new signups





Returning Visitors



Returning user percentage (tracked by cookies or login)

Endpoints





GET /api/admin/analytics/registries?date_range=



GET /api/admin/analytics/user-behavior?period=





Customer Support Analytics

Metrics pulled directly from Feature A-6 for support performance monitoring.







Metric



Description





Total Tickets



All logged tickets in period





Average Resolution Time



Avg. time between ticket creation and resolution





Escalation Rate



% of tickets requiring admin escalation





SLA Compliance



% of tickets resolved within set time limits

Endpoints





GET /api/admin/support/analytics?date_range=





System Health & Performance

Technical monitoring for uptime and key performance stats.







Metric



Description





Server Uptime



% uptime (target 99.9%)





API Response Time



Average request-response latency





Error Logs (Summary)



API errors, failed payments, or request timeouts





Storage Usage



Total asset storage usage (linked to cost projections)

Endpoints





GET /api/admin/system/health



GET /api/admin/system/logs?date_range=





📈 Visualization Components (Frontend)





Metric Cards: Topline KPIs



Bar Charts: Sales, vendor performance



Line Charts: User growth, registry activity



Pie Charts: Category breakdowns (registry types, vendor industries)



Tables: Detailed lists for exports and drill-downs

(Use Chart.js or Recharts for consistency.)



Data Model Overview







Table



Key Fields



Description





analytics_snapshots



id, metric_type, value, recorded_at



Cached metric summaries





system_logs



id, event, timestamp, level



Error and uptime records



 Security & Compliance





Financial data restricted to Finance Admin and Super Admin roles only.



Exports logged in audit_trail table for transparency.



API endpoints protected with JWT tokens and role-based access controls.



No personally identifiable user data stored in analytics cache.





Feature A-8 — Content & Policy Pages Management



Feature Purpose

The Content & Policy Pages Management module enables admins to manage all non-dynamic website content (FAQs, Terms, Privacy, Contact, etc.) and update system-generated communications such as email templates (vendor approval, registry confirmations, payment receipts, etc.).

This ensures that Giftologi’s messaging, branding, and legal materials remain consistent, editable, and version-controlled — without needing developer intervention.



User Roles with Access







Role



Access Level





Super Admin



Full access to edit, publish, or delete content and templates.





Support Admin



Edit FAQs, Contact details, and customer-facing informational text.





Operations Admin



Suggest or create drafts for new policy updates.



Core Components

Static Page Management

Admins can view or edit static pages accessible from the site footer or help sections.

Default Pages





FAQ Page



Contact Page



Terms & Conditions



Privacy Policy



Return & Refund Policy



Shipping & Delivery Policy



Fields (Edit Form)







Field



Type



Description





Meta Title



Text



For SEO





Meta Description



Text



For SEO





Body Content



Rich Text Editor



WYSIWYG input area with formatting tools





Publish Status



Toggle



Draft / Published





Last Edited By



Auto



Records admin username & timestamp

Actions





Edit Page → Opens existing content in WYSIWYG editor



Save as Draft / Publish / Archive



Preview Page → Opens frontend view in modal or new tab



Endpoints





GET /api/admin/pages



PATCH /api/admin/pages/:id/update



Data Model







Table



Key Fields



Description





pages



id, title,  body,  status, updated_by, updated_at



Main content storage





page_revisions



id, page_id, body_snapshot, edited_by, edited_at



Version control table





Email Template Management

Centralized system for editing and managing automated notification templates sent to users, vendors, or admins.

Template Categories







Category



Description



Example Templates





Vendor Lifecycle



For vendor account actions



Vendor Approval / Rejection / Verification Pending





Gift Registry Lifecycle



For hosts & guests



Registry Created / Gift Purchased / Registry Reminder / Thank-You Notification





Order & Payment



For guests & vendors



Order Confirmation / Payment Receipt / Delivery Update





Finance & Payouts



For vendors



Payout Approved / Payout Failed / Service Charge Notice

Template Fields







Field



Type



Description





Template Name



Text



Internal reference name





Subject Line



Text



Email subject





Sender Name



Text



“From” display name (e.g. Giftologi Support)





Recipient Type



Dropdown



Host / Guest / Vendor / Admin





Body (HTML)



Rich Text / Code Editor



HTML-formatted email body





Dynamic Variables



Chips



e.g. {first_name}, {order_id}, {registry_link}





Preview



Button



Opens a test render of email





Send Test Email



Button



Sends to admin’s email





Active Status



Toggle



Enable/Disable template in use

Endpoints





GET /api/admin/email-templates



POST /api/admin/email-templates/create



PATCH /api/admin/email-templates/:id/update



POST /api/admin/email-templates/test

Data Model







Table



Key Fields



Description





email_templates



id, name, subject, body_html, category, variables, active



Stores email templates





email_logs



id, template_id, recipient, sent_at, status



History of email dispatches





FAQ Management

Allows support staff to manage customer-facing FAQ entries with categories for better organization.

Fields







Field



Type



Description





Question



Text



The FAQ question





Answer



Rich Text



Formatted answer content





Category



Dropdown



Registry / Orders / Payments / Vendors / Account





Order



Number



Determines display order





Visibility



Toggle



Public / Private





Last Updated By



Auto



Tracks editor name and timestamp

Endpoints





GET /api/admin/faqs



POST /api/admin/faqs/create



PATCH /api/admin/faqs/:id/update



DELETE /api/admin/faqs/:id/delete

Data Model







Table



Key Fields



Description





faqs



id, question, answer, category, order, status, updated_by



FAQ entries





Contact Page Management

Admins can update customer support contact details and forms displayed on the Contact Us page.

Editable Fields





Support email



Support phone number



Office address



Google Map embed (optional iframe)



Business hours



WhatsApp link toggle

Form Fields (Frontend Contact Form)







Field



Type



Validation





Name



Text



Required





Email



Email



Required





Subject



Text



Optional





Message



Textarea



Required





Attachment



File



Optional, max 5MB

Endpoints





GET /api/admin/contact-info



PATCH /api/admin/contact-info/update



POST /api/contact/submit (Public)

Data Model







Table



Key Fields



Description





contact_info



id, email, phone, address, map_embed, whatsapp_link



Contact settings





contact_messages



id, name, email, subject, message, file, created_at



Submitted messages





Page Access & Version Control

Every change made to static or email content must be logged for traceability.

Audit Log Fields







Field



Description





Editor



Admin username





Action



Created / Updated / Deleted





Page/Template Name



Name or slug





Timestamp



Auto timestamp





Change Summary



Short description of change

Endpoint





GET /api/admin/audit-trail?category=content





Security & Workflow Rules





Only Super Admins can delete or permanently archive pages/templates.



Role-based edit restrictions (Finance Admin cannot modify registry templates, etc.).



Auto-save and preview for drafts to prevent content loss.



All HTML templates sanitized to prevent injection.



Rollback supported up to the last 5 revisions per page/template.





Feature A-9 — Order & Transaction Management



Feature Purpose

The Order & Transaction Management feature gives admins full visibility and control over all orders, payments, and gift transactions happening on Giftologi.
It connects directly to vendor sales, gift registry purchases, and guest checkouts — allowing the admin team to track, verify, and resolve order-related or financial issues across the platform.

This feature acts as the financial heartbeat of the system, providing transparent order lifecycle tracking, payment validation, refund initiation, and payout monitoring.



User Roles with Access







Role



Access Level





Super Admin



Full access to view, update, and manually override transactions or order statuses.





Finance Admin



Access to all payment and payout details, initiate refunds, mark settlements.





Operations Admin



View orders related to product performance but cannot edit or process payments.





Support Admin



Can view customer orders for issue resolution and communication but cannot modify transactions.



Core Components



Orders Dashboard (Main Table View)

Displays a real-time table of all orders made on the platform — whether from a gift registry purchase or a direct vendor store order.

Filters





Date range (Order Date, Payment Date)



Order status (Pending, Confirmed, Shipped, Delivered, Cancelled)



Payment status (Paid, Failed, Refunded, Awaiting Confirmation)



Purchase type (Gift Registry / Direct)



Vendor



Buyer Name / Email



Payment method (Card, Bank Transfer, Wallet)



Delivery location (Region/City)

Table Columns







Column



Description





Order ID



Unique identifier (auto-generated, prefixed with ORD-)





Order Date



Date/time of order creation





Buyer Name & Email



From guest or host account





Vendor Name



Linked vendor name





Items Count



Total number of items





Order Total



Full purchase amount (before service fee)





Payment Status



Paid / Failed / Refunded





Order Status



Pending / Confirmed / Shipped / Delivered / Cancelled





Payment Method



Card / Transfer / Wallet





Registry ID



If linked to a registry





Actions



View / Edit / Refund / Message Buyer

Endpoints





GET /api/admin/orders



GET /api/admin/orders/:id



PATCH /api/admin/orders/:id/update-status



POST /api/admin/orders/refund/:id



GET /api/admin/orders/export





Order Details View

Clicking any order opens a detailed summary page with complete transactional and logistical information.

Sections





Order Overview





Order ID



Order Date



Registry (if applicable)



Buyer Info



Vendor Info



Total Amount / Subtotal / Tax / Service Fee breakdown



Current Order Status



Payment Reference ID (from Payment API)



Item Breakdown







Field



Description





Product Image



Thumbnail





Product Name



Linked to vendor listing





Quantity



Ordered quantity





Unit Price



Price per item





Total



Quantity × Price





Vendor SKU



Vendor product ID



Payment Information





Payment Reference



Payment Provider (e.g. Expresspay)



Transaction ID



Payment Date & Time



Amount Paid



Fees Charged (Gateway fee)



Payout Status (Pending / Completed / On Hold)



Customer Notes / Gift Message





Text box for buyer’s message (if provided)



Gift wrap / delivery note option



Activity Log





Timestamped updates for order status changes, admin notes, refund requests, etc.



Admin Actions





Update Order Status → Dropdown
(Pending → Confirmed → Shipped → Delivered → Cancelled)



Initiate Refund (via Payment API)



Contact Buyer / Contact Vendor (opens modal or triggers email)



Add Internal Note (visible only to admins)





Refund & Dispute Management

Admins can manage refunds or disputes directly from the order screen.

Refund Flow





Admin clicks Initiate Refund



Pop-up appears:





Refund Reason (dropdown: Customer Request / Vendor Error / Failed Delivery / System Error)



Refund Amount (auto-filled, editable)



Notes (optional)



Confirmation checkbox (“This refund will be processed via payment gateway”)



On confirmation:





Refund request is logged



Payment gateway API is called (Paystack/Flutterwave endpoint)



Transaction record updated to reflect refund



Buyer and vendor notified automatically via email

Refund Endpoints





POST /api/admin/orders/:id/refund → Initiates refund via Payment API



GET /api/admin/refunds → Lists all refunds



PATCH /api/admin/refunds/:id/resolve → Marks refund as completed

Refund Log Fields







Field



Description





Refund ID



Unique internal identifier





Order ID



Linked order





Amount



Amount refunded





Initiated By



Admin username





Refund Method



Via Payment API





Status



Pending / Completed / Failed





Reason



Selected refund reason





Timestamp



Date/time of action





Vendor Payout Tracking

Each successful order generates a vendor earnings record for later payout.

Fields







Field



Description





Vendor Name



Linked vendor account





Order ID



Source of funds





Earnings (After Commission)



Amount vendor should receive





Payout Status



Pending / Processing / Paid





Payout Date



Date funds were sent





Transaction Ref



Linked payment record





Settlement Type



Auto or Manual

Endpoints





GET /api/admin/payouts



PATCH /api/admin/payouts/:id/mark-paid



POST /api/admin/payouts/manual



Financial Reporting & Export

Admins can generate reports for accounting and auditing purposes.

Report Types





Daily, Weekly, Monthly Order Summaries



Refund Reports



Vendor Payout Reports



Registry Gift Purchase Reports

Actions





Export as CSV / PDF



Filter by Vendor / Date / Payment Status



Send Report to Email

Endpoints





GET /api/admin/reports/orders?type=summary



GET /api/admin/reports/payouts



GET /api/admin/reports/refunds



Security & Workflow Rules





Only Finance Admin or Super Admin can modify payment-related fields.



Order status updates trigger email notifications to both vendor and buyer.



Refund initiation always calls third-party API (Expresspay).



Audit logs capture every change made to orders and payouts.



No hard deletion of order data — only archival.