export const publicRoutes = [`/`];

export const authRoutes = [
  `/login`,
  `/signup`,
  `/forgot-password`,
  `/password-reset`,
];

export const apiAuthPath = `/api/auth`;

// export const loginRedirect = `/me/dashboard`;

export const loginRedirect = `/`;

export const protectedRoutes = ["/dashboard/h", "/dashboard/a", "/dashboard/v"];

// Map user roles in `profiles.role` to their dashboard paths
export const roleRedirects = {
  host: "/dashboard/h",
  admin: "/dashboard/a",
  vendor: "/dashboard/v",
};