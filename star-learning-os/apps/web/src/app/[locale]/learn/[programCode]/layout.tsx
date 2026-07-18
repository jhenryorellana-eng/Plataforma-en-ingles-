import { LearnShell } from '@/components/nav';

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  return (
    <LearnShell locale={locale} programCode={programCode}>
      {children}
    </LearnShell>
  );
}
