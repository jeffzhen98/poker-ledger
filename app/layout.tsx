import "./globals.css";
import { ReactNode } from "react";


export default function RootLayout({ children }: { children: ReactNode }) {
return (
<html lang="en">
<body className="m-0 p-0 overflow-x-hidden">
{children}
</body>
</html>
);
}