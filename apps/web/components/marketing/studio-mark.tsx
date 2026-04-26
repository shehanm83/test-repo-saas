import React from "react";

import styles from "../../app/page.module.css";

export function StudioMark({ size = 24 }: { size?: number }) {
  return (
    <div className={styles.studioMark} style={{ width: size, height: size, fontSize: size * 0.55 }}>
      <span>S</span>
    </div>
  );
}
