import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// The assignment UI moved into the rallye detail page (questions tab).
// Keep the old URL working for bookmarks and legacy links.
export default async function LegacyAssignmentRedirect(props: PageProps) {
  const params = await props.params;
  if (!/^\d+$/.test(params.id)) {
    notFound();
  }
  redirect(`/rallyes/${params.id}`);
}
