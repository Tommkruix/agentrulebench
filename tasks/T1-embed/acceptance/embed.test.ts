import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/programs/actions/get-program-by-slug.action", () => ({
  getProgramBySlug: vi.fn(),
}));

import { getProgramBySlug } from "@/features/programs/actions/get-program-by-slug.action";
import { GET } from "./route";

const program = { slug: "push-pull", title: "Push Pull Legs", description: "A six-week PPL split." };

describe("T1-embed acceptance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns HTML containing the program title and a link to the program page", async () => {
    vi.mocked(getProgramBySlug).mockResolvedValue(program);
    const res = await GET(new Request("http://t/api/programs/push-pull/embed"), { params: Promise.resolve({ slug: "push-pull" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/html");
    const body = await res.text();
    expect(body).toContain("Push Pull Legs");
    expect(body).toMatch(/href="\/programs\/push-pull"/);
  });

  it("returns 404 when the program does not exist", async () => {
    vi.mocked(getProgramBySlug).mockResolvedValue(null);
    const res = await GET(new Request("http://t/api/programs/nope/embed"), { params: Promise.resolve({ slug: "nope" }) });
    expect(res.status).toBe(404);
  });
});
