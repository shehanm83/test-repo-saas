import Link from "next/link";

import { I } from "@/components/icons";

/**
 * Campaign list. Slice 60·A has no `campaigns` table yet, so this is the empty
 * state plus the way in; 60·D lists the workspace's real campaigns.
 */
export default function CampaignsPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Campaigns</h1>
          <p className="page__sub">
            Quick Create makes a post. A campaign makes a month — planned, dated, and made on brand.
          </p>
        </div>
        <Link href="/campaigns/new" className="btn btn--accent">
          <I.Plus size={14} />
          New campaign
        </Link>
      </div>

      <div className="empty card">
        <div className="empty__art">
          <I.Calendar size={32} />
        </div>
        <div className="empty__title">No campaigns yet</div>
        <div className="empty__sub">
          Start from a brief — what you&rsquo;re doing, for whom, and for how long. Everything else
          is proposed for you and stays editable before anything is generated.
        </div>
        <Link href="/campaigns/new" className="btn btn--accent no-underline">
          <I.Sparkle size={14} />
          Build a campaign
        </Link>
      </div>
    </div>
  );
}
