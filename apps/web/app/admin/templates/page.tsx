import { TemplateApi } from "@studio/api/template";
import { loadConfig } from "@studio/shared";

import { TemplateStudio } from "@/components/admin/template-studio";

export default async function AdminTemplatesPage() {
  const templates = await new TemplateApi(loadConfig()).adminList();
  return <TemplateStudio templates={templates as never} />;
}
