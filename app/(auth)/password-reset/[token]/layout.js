import "../../../globals.css";

export const metadata = {
  title: "Giftologi | Password Reset",
  description: "Giftologi Password Reset",
};

export default function RootLayout({ children }) {
  return (
    <>
      <div className="font-brasley-medium bg-white text-black dark:bg-gray-950 dark:text-white w-full min-h-screen">{children}</div>
    </>
  );
}
