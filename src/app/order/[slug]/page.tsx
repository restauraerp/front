'use client';
import { useParams } from 'next/navigation';
import OnlineOrder from './OnlineOrder';

/** The restaurant's online order link: /order/{restaurant-code}. */
export default function OnlineOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  return <OnlineOrder slug={slug} />;
}
