import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'GiaSư Pro | Quản Lý Lịch Dạy & Chấm Công Gia Sư',
  description: 'Hệ thống tự động chấm công, tính thu nhập và sắp xếp lịch học gia sư đa màu sắc cho giáo viên.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} font-sans h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
