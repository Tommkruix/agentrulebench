import { renderToStaticMarkup } from "react-dom/server";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgramBySlug } from "@/features/programs/actions/get-program-by-slug.action";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const program = await getProgramBySlug(slug);
    if (!program) {
      return new Response("Program not found", { status: 404 });
    }
    const href = `/programs/${program.slug}`;
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>{program.title}</CardTitle>
        </CardHeader>
        <CardContent>{program.description}</CardContent>
        <CardFooter>
          <a href={href}>View program</a>
        </CardFooter>
      </Card>,
    );
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("Error building program embed:", error);
    return new Response("Failed to build embed", { status: 500 });
  }
}
