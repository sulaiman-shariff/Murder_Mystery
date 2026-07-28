import "./globals.css";

export const metadata = {
  title: "Murder Mystery",
  description: "An AI-powered murder mystery investigation game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
