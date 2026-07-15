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
    <div className="mx-auto min-h-dvh max-w-2xl">
      <TopBar locale={locale} subtitle="English Path · B1 → B2" />
      <main className="px-4 pb-32 pt-6">{children}</main>
      <BottomNav locale={locale} programCode={programCode} />
    </div>
  );
}
