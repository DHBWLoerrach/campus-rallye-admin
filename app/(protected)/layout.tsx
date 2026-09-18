import { requireProfile } from '@/lib/require-profile';
import Navigation from '@/components/Navigation';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireProfile(true);
  return (
    <>
      <Navigation isAdmin={profile.admin === true} />
      {children}
    </>
  );
}
