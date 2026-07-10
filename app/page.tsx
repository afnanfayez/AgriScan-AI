import { redirect } from 'next/navigation';

// Middleware handles the common case (redirecting based on session state)
// before this ever renders; this is defense-in-depth for the fallback route.
export default function RootPage() {
  redirect('/login');
}
