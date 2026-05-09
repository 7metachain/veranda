"use client";

export function CeremonyVideo({ url }: { url: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-veranda-ink/10">
      <video src={url} controls autoPlay className="w-full h-auto" />
      <p className="px-5 py-3 text-veranda-ink/50 text-xs">
        Filmed in Gazebo on a TurtleBot — your match's flower being picked up
        from the cafe table.
      </p>
    </div>
  );
}
