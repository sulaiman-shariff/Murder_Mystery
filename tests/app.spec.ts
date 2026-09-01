import { test, expect, type APIRequestContext } from "@playwright/test";

const EVENT_CODE = process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "ATRIA";

/** Registers a fresh team and returns a request context holding its cookie. */
async function newTeam(request: APIRequestContext) {
  const name = `T${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 99)}`;
  const res = await request.post("/api/teams/register", {
    data: { name, pin: "1234", eventCode: EVENT_CODE },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { teamId: body.team.id as string, eventId: body.team.eventId as string };
}

test.describe("Pages render", () => {
  test("home shows the case file and the sign-in form", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("MURDER");
    await expect(page.getByRole("tab", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "New Team" })).toBeVisible();
  });

  test("leaderboard loads", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.locator("h1")).toContainText("Standings");
  });

  test("admin asks for a passcode", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("result screens load", async ({ page }) => {
    // The stamp locator, not getByText — the caption matches both the stamp
    // and its wrapper, which is a strict-mode violation.
    await page.goto("/win?mysteryId=room-314&score=850&time=300");
    await expect(page.locator(".stamp")).toContainText("Case Closed");

    await page.goto("/lost?mysteryId=vaughn-street");
    await expect(page.locator(".stamp")).toContainText("Case Cold");
  });
});

test.describe("Health", () => {
  test("does not advertise the AI configuration", async ({ request }) => {
    const body = await (await request.get("/api/health")).json();
    expect(body.status).toBe("healthy");
    // Deliberately absent — it used to leak the model and whether a key was set.
    expect(body.model).toBeUndefined();
    expect(body.hasAiKey).toBeUndefined();
  });
});

test.describe("Access control", () => {
  test("state cannot be written for a team you are not", async ({ request }) => {
    const res = await request.post("/api/sessions/state", {
      data: {
        teamId: "00000000-0000-0000-0000-000000000000",
        mysteryId: "room-314",
        state: {},
      },
    });
    expect(res.status()).toBe(401);
  });

  test("the solution is refused while the case is open", async ({ request }) => {
    const { teamId, eventId } = await newTeam(request);
    await request.post("/api/sessions/start", {
      data: { teamId, eventId, mysteryId: "room-314" },
    });
    const res = await request.get(
      `/api/mysteries/room-314/reveal?teamId=${teamId}`
    );
    expect(res.status()).toBe(403);
  });
});

test.describe("Accusation", () => {
  test("incomplete proof is rejected and never says which clue", async ({ request }) => {
    const { teamId, eventId } = await newTeam(request);
    await request.post("/api/sessions/start", {
      data: { teamId, eventId, mysteryId: "room-314" },
    });

    const res = await request.post("/api/accuse", {
      data: {
        mysteryId: "room-314",
        murdererGuess: "the night porter",
        motiveGuess: "revenge for taking her family's home and her mother's locket",
        evidenceIds: ["door-log"],
      },
    });
    const body = await res.json();

    expect(body.verdict).toBe("rejected");
    expect(body.parts.proof.verdict).toBe("incomplete");
    expect(body.parts.proof.missingCount).toBeGreaterThan(0);
    // Counts only. The response must not name the clues that were missing.
    expect(JSON.stringify(body)).not.toContain("key-register");
    expect(JSON.stringify(body)).not.toContain("pawn-ticket");
  });

  test("a complete accusation closes the case and scores it", async ({ request }) => {
    const { teamId, eventId } = await newTeam(request);
    await request.post("/api/sessions/start", {
      data: { teamId, eventId, mysteryId: "room-314" },
    });

    const body = await (
      await request.post("/api/accuse", {
        data: {
          mysteryId: "room-314",
          murdererGuess: "the night porter",
          motiveGuess:
            "revenge, he took her family's home and her mother's locket",
          evidenceIds: ["door-log", "key-register", "pawn-ticket"],
        },
      })
    ).json();

    expect(body.verdict).toBe("solved");
    expect(body.score).toBeGreaterThan(0);
    // The breakdown must actually add up to the score shown beside it.
    const b = body.breakdown;
    const sum =
      b.base - b.timePenalty - b.wrongPenalty - b.hintPenalty + b.bonus;
    expect(b.total).toBe(sum + body.bonuses.total);

    // And the solution is available only now.
    const reveal = await request.get(
      `/api/mysteries/room-314/reveal?teamId=${teamId}`
    );
    expect(reveal.status()).toBe(200);
  });
});

test.describe("Alibi challenges are not an oracle", () => {
  test("failure is identical whether the alibi is breakable or not", async ({ request }) => {
    const { teamId, eventId } = await newTeam(request);
    await request.post("/api/sessions/start", {
      data: { teamId, eventId, mysteryId: "room-314" },
    });

    const challenge = (suspectId: string, evidenceIds: string[]) =>
      request
        .post("/api/alibi/challenge", {
          data: { mysteryId: "room-314", suspectId, evidenceIds },
        })
        .then((r) => r.json());

    // piers-landon has no authored break at all; dinah-coyle does but this is
    // the wrong evidence for it. Both must answer the same.
    const noBreak = await challenge("piers-landon", ["bar-tab"]);
    const wrongEvidence = await challenge("dinah-coyle", ["bar-tab"]);

    expect(noBreak.broken).toBe(false);
    expect(wrongEvidence.broken).toBe(false);
    expect(noBreak.message).toBe(wrongEvidence.message);
  });

  test("breaking an innocent's alibi does not implicate them", async ({ request }) => {
    const { teamId, eventId } = await newTeam(request);
    await request.post("/api/sessions/start", {
      data: { teamId, eventId, mysteryId: "room-314" },
    });

    const body = await (
      await request.post("/api/alibi/challenge", {
        data: {
          mysteryId: "room-314",
          suspectId: "hugo-vance",
          evidenceIds: ["house-phone-log"],
        },
      })
    ).json();

    expect(body.broken).toBe(true);
    // "weakens", not "places-at-scene" — at least one break per case must land
    // on an innocent, or breaking an alibi becomes a one-click solve.
    expect(body.consequence).toBe("weakens");
  });
});

test.describe("Interrogation never names the killer", () => {
  test("confronting the murderer does not give them away", async ({ request }) => {
    const { teamId, eventId } = await newTeam(request);
    await request.post("/api/sessions/start", {
      data: { teamId, eventId, mysteryId: "room-314" },
    });

    const body = await (
      await request.post("/api/ai/interrogate", {
        data: {
          mysteryId: "room-314",
          suspectId: "dinah-coyle",
          evidenceId: "pawn-ticket",
        },
      })
    ).json();

    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(0);
    expect(body.reply).not.toMatch(/\bdinah\b|\bcoyle\b/i);
    expect(body.reply).not.toMatch(/i killed|i confess|the murderer is/i);
  });
});

test.describe("Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("home has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
  });

  test("leaderboard has no horizontal overflow", async ({ page }) => {
    await page.goto("/leaderboard");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
  });
});
