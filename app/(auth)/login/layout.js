import "../../globals.css";

export const metadata = {
  title: "Giftologi | Login",
  description: "Giftologi Login",
};

export default function RootLayout({ children }) {
  return (
    <>
      <div className="font-poppins bg-white text-black dark:bg-gray-950 dark:text-white w-full min-h-screen">{children}</div>
    </>
  );
}
