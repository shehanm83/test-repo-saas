import { MoodApi } from "@layertone/api/mood";
import { loadConfig } from "@layertone/shared/config";

import { MoodStudio } from "@/components/admin/mood-studio";

export default async function AdminMoodsPage() {
  const moods = await new MoodApi(loadConfig()).adminList();
  return <MoodStudio moods={moods as never} />;
}
