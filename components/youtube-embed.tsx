export function YouTubeEmbed({ id, title }: { id: string; title?: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        className="size-full"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title ?? "YouTube preview"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
