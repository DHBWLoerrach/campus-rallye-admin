import { requireProfile } from '@/lib/require-profile';
import { ThemeProvider } from '@/components/ThemeProvider';
import Navigation from '@/components/Navigation';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireProfile(true);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Navigation isAdmin={profile.admin === true} />
      {children}
    </ThemeProvider>
  );
}
