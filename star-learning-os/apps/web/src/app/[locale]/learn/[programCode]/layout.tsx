import { BottomNav, TopBar } from '@/components/nav';

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  return (
    <div className="min-h-dvh">
      <TopBar locale={locale} />
      <main className="mx-auto max-w-2xl px-4 pb-36 pt-6">{children}</main>
      <BottomNav locale={locale} programCode={programCode} />
    </div>
  );
}
