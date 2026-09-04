import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  src?: string | null;
  videoSrc?: string | null;
  className?: string;
  imageClassName?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "A";
  const last = parts[parts.length - 1] ?? first;
  return (
    parts.length > 1 ? `${first[0] ?? "A"}${last[0] ?? "A"}` : first.slice(0, 2)
  ).toUpperCase();
}

export function UserAvatar({ name = "AIDORU", src, videoSrc, className, imageClassName }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    setVideoFailed(false);
  }, [src, videoSrc]);
  const hasVideo = Boolean(videoSrc && !videoFailed);
  const hasImage = Boolean(src && !failed);
  return (
    <span
      className={cn("aidoru-avatar", className)}
      aria-label={`${name ?? "User"} profile picture`}
    >
      {hasVideo ? (
        <video
          src={videoSrc ?? undefined}
          className={cn("h-full w-full object-cover", imageClassName)}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="Animated profile picture"
          onError={() => setVideoFailed(true)}
        />
      ) : hasImage ? (
        <img
          src={src ?? undefined}
          alt=""
          className={cn("h-full w-full object-cover", imageClassName)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="aidoru-avatar-fallback">{initials(name ?? "AIDORU")}</span>
      )}
    </span>
  );
}
