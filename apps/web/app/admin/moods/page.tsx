import { MoodApi } from "@vyora/api/mood";
import { loadConfig } from "@vyora/shared/config";

import { MoodStudio } from "@/components/admin/mood-studio";

export default async function AdminMoodsPage() {
  const moods = await new MoodApi(loadConfig()).adminList();
  return <MoodStudio moods={moods as never} />;
}
