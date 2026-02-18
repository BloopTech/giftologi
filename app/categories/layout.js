import PublicNavbar from "../components/PublicNavbar";

export default function CategoriesLayout({ children }) {
  return (
    <>
      <PublicNavbar />
      {children}
    </>
  );
}