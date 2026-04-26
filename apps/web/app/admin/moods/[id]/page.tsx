import { redirect } from "next/navigation";

export default async function AdminMoodRedirect(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/admin/moods?selected=${id}`);
}

