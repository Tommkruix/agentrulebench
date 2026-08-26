import { getProgramBySlug } from "@/features/programs/actions/get-program-by-slug.action";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] as string);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const program = await getProgramBySlug(slug);
    if (!program) {
      return new Response("Program not found", { status: 404 });
    }
    const href = `/programs/${program.slug}`;
    const html =
      `<div class="wc-program-embed">` +
      `<h3>${escapeHtml(program.title)}</h3>` +
      `<p>${escapeHtml(program.description)}</p>` +
      `<a href="${href}">View program</a>` +
      `</div>`;
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("Error building program embed:", error);
    return new Response("Failed to build embed", { status: 500 });
  }
}
