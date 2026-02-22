import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { DeveloperModeProvider } from '@/contexts/developer-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agent Player - AI Workflow Platform',
  description: 'Self-hosted AI platform with workflow automation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <DeveloperModeProvider>
              <NotificationProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
              </NotificationProvider>
            </DeveloperModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
