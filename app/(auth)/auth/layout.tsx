import { AuthVisualPanel } from "./_components/auth-visual-panel";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="dark relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(125,211,252,0.14),transparent_30%),radial-gradient(circle_at_14%_80%,rgba(167,139,250,0.12),transparent_32%),linear-gradient(180deg,#05070d_0%,#080b13_52%,#03050b_100%)]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[0.045] to-transparent" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <AuthVisualPanel />

        <section className="order-1 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:order-2 lg:px-10 lg:py-10">
          <div className="w-full max-w-[430px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
