import PublicNavbar from "../components/PublicNavbar";

export default function RegistryLayout({ children }) {
  return (
    <>
      <PublicNavbar />
      {children}
    </>
  );
}
