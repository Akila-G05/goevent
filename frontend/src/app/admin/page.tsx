import { Suspense } from 'react';
import { AdminDashboard } from '@/components/admin/dashboard';
export const metadata = { title: 'GoEvent · Administration', robots: { index: false, follow: false } };
export default function AdminPage() {
 return <Suspense fallback={<p className="p-8">Loading administration…</p>}><AdminDashboard/></Suspense>;
}
