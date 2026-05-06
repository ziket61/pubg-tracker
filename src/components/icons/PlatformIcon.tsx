import type { Shard } from "@/lib/pubg/shards";

const COLORS: Record<Shard, string> = {
  steam: "#1b2838",
  psn: "#003791",
  xbox: "#107C10",
  kakao: "#FFE812",
  console: "#525252",
  stadia: "#CD2A2A",
};

const LABEL: Record<Shard, string> = {
  steam: "S",
  psn: "P",
  xbox: "X",
  kakao: "K",
  console: "C",
  stadia: "G",
};

export function PlatformIcon({
  platform,
  size = 18,
}: {
  platform: Shard;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded font-mono text-xs font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: COLORS[platform],
        color: platform === "kakao" ? "#08090c" : "#fff",
      }}
      aria-label={platform}
    >
      {LABEL[platform]}
    </span>
  );
}
