import { redirect } from "next/navigation";

export default async function AdminTemplateRedirect(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/admin/templates?selected=${id}`);
}

