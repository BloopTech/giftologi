export const publicRoutes = [`/`];

export const eventPublicRoutes = [`/event/:event_code`];

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
  "/dashboard/s_a",
  "/dashboard/f_a",
  "/dashboard/o_m_a",
  "/dashboard/c_s_a",
  "/dashboard/v",
  "/g",
];

// Map user roles in `profiles.role` to their dashboard paths
export const roleRedirects = {
  host: "/dashboard/h",
  super_admin: "/dashboard/s_a",
  finance_admin: "/dashboard/f_a",
  operations_manager_admin: "/dashboard/o_m_a",
  customer_support_admin: "/dashboard/c_s_a",
  vendor: "/dashboard/v",
  guest: "/g",
};