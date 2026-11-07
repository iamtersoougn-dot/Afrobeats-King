import type { Metadata } from "next";
import AdvertiserPage from "@/components/advertise/AdvertiserPage";

export const metadata: Metadata = {
  title: "Advertise · Afrobeats King",
  description: "Billboards on the Lagos map, Lagoon FM spots, sponsored songs and virtual concerts in Afrobeats King. From ₦5,000 a week.",
};

export default function Page() {
  return <AdvertiserPage />;
}
