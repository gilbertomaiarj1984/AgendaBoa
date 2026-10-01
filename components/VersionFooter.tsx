// Barra fixa com a versão que está no ar. Os valores são gravados no build (next.config.ts):
// versão = package.json, build = commit do GitHub Actions, data = hora do build.
const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const build = process.env.NEXT_PUBLIC_GIT_SHA ?? "local";
const builtAt = process.env.NEXT_PUBLIC_BUILD_TIME;

function formatBuildTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

export default function VersionFooter() {
  const when = formatBuildTime(builtAt);
  return (
    <footer className="foot">
      <div className="foot-in">
        <span><i className="dot-live" aria-hidden="true" />AgendaBoa <b>v{version}</b></span>
        <span><span className="pill">build {build}</span>{when && <span>{when}</span>}</span>
      </div>
    </footer>
  );
}
