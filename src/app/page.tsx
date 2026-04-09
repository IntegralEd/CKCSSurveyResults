import { redirect } from 'next/navigation';

/**
 * Root page: immediately redirect to /dashboard.
 */
export default function RootPage() {
  redirect('/dashboard');
}
