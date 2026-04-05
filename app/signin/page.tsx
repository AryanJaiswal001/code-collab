import { redirect } from "next/navigation";

type SignInAliasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function appendQueryParam(
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined,
) {
  if (typeof value === "string" && value.length) {
    params.set(key, value);
    return;
  }

  if (Array.isArray(value) && value.length) {
    params.set(key, value[0] ?? "");
  }
}

export default async function SignInAliasPage({
  searchParams,
}: SignInAliasPageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();

  appendQueryParam(params, "callbackUrl", query.callbackUrl);
  appendQueryParam(params, "error", query.error);

  const nextQuery = params.toString();
  redirect(nextQuery ? `/auth/sign-in?${nextQuery}` : "/auth/sign-in");
}
