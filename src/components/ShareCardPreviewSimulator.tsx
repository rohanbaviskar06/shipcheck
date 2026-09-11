import { useState } from "react";
import { ImageOff, ExternalLink, MessageSquare, Twitter, MessageCircle } from "lucide-react";

export type SharePreviewData = {
  title?: string;
  description?: string;
  image?: string;
  host: string;
};

type Platform = "x" | "slack" | "discord";

export function ShareCardPreviewSimulator({
  title,
  description,
  image,
  host,
}: SharePreviewData) {
  const [platform, setPlatform] = useState<Platform>("x");
  const [imgError, setImgError] = useState(false);

  const cleanHost = host.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const displayTitle = title?.trim() || "No title declared (missing og:title)";
  const displayDesc =
    description?.trim() ||
    "No description found. Platforms will either leave this blank or scrape raw body text.";
  const hasValidImage = Boolean(image && !imgError);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background/50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Social preview simulator
          </span>
          {!hasValidImage && (
            <span className="rounded bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-medium text-destructive">
              Missing preview image
            </span>
          )}
        </div>

        {/* Platform Switcher */}
        <div className="flex rounded-lg border border-border bg-card p-0.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setPlatform("x")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
              platform === "x"
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Twitter className="h-3 w-3" />
            <span>X (Twitter)</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform("slack")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
              platform === "slack"
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            <span>Slack</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform("discord")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
              platform === "discord"
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-3 w-3" />
            <span>Discord</span>
          </button>
        </div>
      </div>

      <div className="pt-4">
        {/* PLATFORM 1: X (Twitter) Card */}
        {platform === "x" && (
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#2f3336] bg-[#000000] text-[#e7e9ea] font-sans shadow-md">
            {/* Image section */}
            <div className="relative aspect-[1.91/1] w-full bg-[#16181c] border-b border-[#2f3336] flex items-center justify-center">
              {hasValidImage ? (
                <img
                  src={image}
                  alt={displayTitle}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center text-[#71767b]">
                  <ImageOff className="h-8 w-8 text-[#71767b]" />
                  <p className="font-mono text-xs font-semibold text-[#e7e9ea]">
                    No og:image specified
                  </p>
                  <p className="max-w-xs text-[11px] leading-relaxed">
                    X will render a plain text link or small icon instead of a clickable photo card.
                  </p>
                </div>
              )}
            </div>

            {/* Content section */}
            <div className="p-3.5 space-y-1">
              <p className="flex items-center gap-1 text-[13px] lowercase text-[#71767b] truncate">
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span>{cleanHost}</span>
              </p>
              <p className="text-[15px] font-normal leading-snug text-[#e7e9ea] line-clamp-1">
                {displayTitle}
              </p>
              <p className="text-[13px] leading-relaxed text-[#71767b] line-clamp-2">
                {displayDesc}
              </p>
            </div>
          </div>
        )}

        {/* PLATFORM 2: Slack unfurl */}
        {platform === "slack" && (
          <div className="mx-auto max-w-md rounded-r-lg border-l-4 border-[#2eb67d] bg-[#f8f8f8] dark:bg-[#1a1d21] p-3.5 shadow-sm space-y-2 font-sans text-left">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center font-mono text-[9px] font-bold text-primary">
                {cleanHost.charAt(0).toUpperCase()}
              </span>
              <span className="text-[13px] font-bold text-[#1d1c1d] dark:text-[#d1d2d3]">
                {cleanHost}
              </span>
            </div>

            <p className="text-[14px] font-bold text-[#1264a3] dark:text-[#1d9bd1] hover:underline cursor-pointer line-clamp-1">
              {displayTitle}
            </p>

            <p className="text-[13px] leading-relaxed text-[#616061] dark:text-[#ababad] line-clamp-2">
              {displayDesc}
            </p>

            {hasValidImage ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-[#e2e2e2] dark:border-[#383a40]">
                <img
                  src={image}
                  alt={displayTitle}
                  onError={() => setImgError(true)}
                  className="max-h-48 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded border border-dashed border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                <ImageOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>No image unfurl: Slack will only show this text snippet.</span>
              </div>
            )}
          </div>
        )}

        {/* PLATFORM 3: Discord embed */}
        {platform === "discord" && (
          <div className="mx-auto max-w-md rounded-md border-l-4 border-[#5865f2] bg-[#2b2d31] p-3.5 shadow-sm space-y-2 text-[#dbdee1] font-sans text-left">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#949ba4]">
              {cleanHost}
            </p>

            <p className="text-[14px] font-semibold text-[#00a8fc] hover:underline cursor-pointer line-clamp-1">
              {displayTitle}
            </p>

            <p className="text-[12px] leading-relaxed text-[#dbdee1] line-clamp-3">
              {displayDesc}
            </p>

            {hasValidImage ? (
              <div className="mt-2 overflow-hidden rounded-md">
                <img
                  src={image}
                  alt={displayTitle}
                  onError={() => setImgError(true)}
                  className="max-h-52 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded bg-[#1e1f22] px-3 py-2 text-xs text-[#949ba4]">
                <ImageOff className="h-4 w-4 shrink-0 text-[#949ba4]" />
                <span>Embed without image preview.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
        Live mockup rendered from your site's Open Graph tags (<code className="text-foreground">og:title</code>, <code className="text-foreground">og:description</code>, <code className="text-foreground">og:image</code>).
      </p>
    </div>
  );
}
