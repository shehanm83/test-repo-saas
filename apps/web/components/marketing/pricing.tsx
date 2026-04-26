import { PLANS, type PlanCode } from "@studio/billing";

import styles from "../../app/page.module.css";

import { Icons } from "./icons";

const ORDER: PlanCode[] = ["free", "starter", "pro", "business", "agency"];
const POPULAR: PlanCode = "pro";

const FEATURES: Record<PlanCode, string[]> = {
  free: ["Standard model", "Mock + watermark", "Email support"],
  starter: ["All Moods", "Standard model", "Email support"],
  pro: ["Premium model", "All Moods", "Priority support"],
  business: ["Priority queue", "All Moods", "SAML SSO ready"],
  agency: ["API access", "White-label", "Dedicated CSM"],
};

function planLabel(code: PlanCode): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}

export function Pricing() {
  return (
    <section className={styles.pricingSection} id="pricing">
      <div className={styles.container}>
        <div className={styles.centerHead}>
          <div className={styles.eyebrow} style={{ color: "#FBE5C2" }}>
            Pricing
          </div>
          <h2 className={styles.h1Light}>Pay for what you generate.</h2>
          <p className={styles.sectionLeadDark}>Free for individuals. Top up anytime.</p>
        </div>
        <div className={styles.pricingGrid}>
          {ORDER.map((code) => {
            const plan = PLANS[code];
            const popular = code === POPULAR;
            const features = [
              `${plan.brandQuota} brand${plan.brandQuota === 1 ? "" : "s"}`,
              `${plan.seatQuota === 999 ? "Unlimited" : plan.seatQuota} seat${
                plan.seatQuota === 1 ? "" : "s"
              }`,
              `${plan.monthlyCreditGrant.toLocaleString()} credits / month`,
              ...FEATURES[code],
            ];
            return (
              <div
                key={code}
                className={`${styles.priceCard} ${popular ? styles.priceCardPopular : ""}`}
              >
                {popular ? <div className={styles.popularBadge}>Most popular</div> : null}
                <div className={styles.priceName}>{planLabel(code)}</div>
                <div className={styles.priceLine}>
                  <span>${plan.price}</span>
                  <small>/mo</small>
                </div>
                <ul className={styles.featureList}>
                  {features.map((feature) => (
                    <li key={feature}>
                      {Icons.check(12)}
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className={styles.pricingNote}>
          What&apos;s a credit? Read the docs →<span>·</span>
          Top up anytime · Credits never expire
        </div>
      </div>
    </section>
  );
}
