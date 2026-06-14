import AuthForm from './auth-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <AuthForm message={message} />
    </main>
  )
}
