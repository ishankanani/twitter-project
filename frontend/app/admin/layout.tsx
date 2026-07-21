import AdminShell from '@/components/admin/AdminShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel | sosyal-medya.net',
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
