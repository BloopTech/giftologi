export const publicRoutes = [`/`, `/vendor`];

export const eventPublicRoutes = [
  `/shop`,
  `/shop/checkout`,
  `/event/:event_code`,
  `/registry`,
  `/registry/:registry_code`,
  `/storefront`,
  `/storefront/:vendor_slug`,
  `/storefront/:vendor_slug/:product_code`,
  `/storefront/:vendor_slug/checkout`,
  `/search`,
];

export const authRoutes = [
  `/login`,
  `/signup`,
  `/forgot-password`,
  `/password-reset`,
];

export const apiAuthPath = `/api/auth`;

// export const loginRedirect = `/me/dashboard`;

export const loginRedirect = `/`;

export const protectedRoutes = [
  "/dashboard/h",
  "/dashboard/admin",
  "/dashboard/v",
  "/g",
];

// Map user roles in `profiles.role` to their dashboard paths
export const roleRedirects = {
  host: "/dashboard/h",
  super_admin: "/dashboard/admin",
  finance_admin: "/dashboard/admin",
  operations_manager_admin: "/dashboard/admin",
  customer_support_admin: "/dashboard/admin",
  store_manager_admin: "/dashboard/admin",
  marketing_admin: "/dashboard/admin",
  vendor: "/dashboard/v",
  guest: "/g",
};