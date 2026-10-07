import EsqueciSenhaForm from '@/components/painel/EsqueciSenhaForm'

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  return <EsqueciSenhaForm linkInvalido={erro === 'link'} />
}
