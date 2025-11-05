import "./globals.css";
import { ReactNode } from "react";


export default function RootLayout({ children }: { children: ReactNode }) {
return (
<html lang="en">
<body className="bg-neutral-50 text-neutral-900">
<div className="max-w-5xl mx-auto p-6 space-y-6">
<header className="flex items-center justify-between">
<h1 className="text-2xl font-bold">Poker Ledger</h1>
<a href="/" className="text-sm underline">New Table</a>
</header>
{children}
</div>
</body>
</html>
);
}