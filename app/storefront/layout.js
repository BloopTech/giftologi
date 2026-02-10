import PublicNavbar from "../components/PublicNavbar";

export default function StorefrontLayout({ children }) {
  return (
    <>
      <PublicNavbar />
      {children}
    </>
  );
}
