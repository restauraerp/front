import { fetchApi } from '@/lib/api';
import { notFound } from 'next/navigation';

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let page: any = null;
  try {
    const allPages = await fetchApi(`/pages`);
    const pages = allPages?.data || allPages || [];
    page = pages.find((p: any) => p.slug === slug);
  } catch {}

  if (!page) notFound();

  return (
    <article className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-extrabold mb-6 text-base-content">{page.title}</h1>
      <div
        className="prose prose-base max-w-none text-base-content/70"
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
    </article>
  );
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const allPages = await fetchApi(`/pages`);
    const pages = allPages?.data || allPages || [];
    const page = pages.find((p: any) => p.slug === slug);
    if (page) {
      return { title: page.meta_title || page.title, description: page.meta_description || '' };
    }
  } catch {}
  return { title: slug };
}
