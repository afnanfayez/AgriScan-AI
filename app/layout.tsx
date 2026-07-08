import type {Metadata} from 'next';
import { Cairo } from 'next/font/google';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/auth-context';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AgriScan AI — Smart Plant Health Inspection',
  description: 'An AI-powered plant health inspection and crop management platform for farmers, nurseries, and gardeners.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cairo.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

