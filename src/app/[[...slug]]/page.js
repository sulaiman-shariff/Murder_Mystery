"use client";

import dynamic from "next/dynamic";

const LegacyApp = dynamic(() => import("../../App"), {
  ssr: false,
  loading: () => <div className="app-loading">Loading investigation...</div>,
});

export default function Page() {
  return <LegacyApp />;
}
