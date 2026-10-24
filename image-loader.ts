// Preview build: images are served as-is from GitHub Pages under the repo path.
export default function loader({ src }: { src: string; width: number; quality?: number }) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}`;
}
