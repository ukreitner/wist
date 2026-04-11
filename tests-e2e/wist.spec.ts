import { test, expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";

interface JoinedPlayer {
  roomCode: string;
  playerToken: string;
  snapshot: {
    me: {
      sessionId: string;
    };
  };
}

const createRoomSet = async (request: APIRequestContext): Promise<{
  host: JoinedPlayer;
  east: JoinedPlayer;
  south: JoinedPlayer;
  west: JoinedPlayer;
}> => {
  const host = (await request.post("http://127.0.0.1:4100/api/rooms", {
    data: { nickname: "Host", testPresetKey: "single-suit-hand" }
  })).json() as Promise<JoinedPlayer>;
  const createdHost = await host;
  const east = (await request.post(`http://127.0.0.1:4100/api/rooms/${createdHost.roomCode}/join`, {
    data: { nickname: "East" }
  })).json() as Promise<JoinedPlayer>;
  const south = (await request.post(`http://127.0.0.1:4100/api/rooms/${createdHost.roomCode}/join`, {
    data: { nickname: "South" }
  })).json() as Promise<JoinedPlayer>;
  const west = (await request.post(`http://127.0.0.1:4100/api/rooms/${createdHost.roomCode}/join`, {
    data: { nickname: "West" }
  })).json() as Promise<JoinedPlayer>;

  return {
    host: createdHost,
    east: await east,
    south: await south,
    west: await west
  };
};

const openPlayerPage = async (browser: Browser, roomCode: string, token: string): Promise<Page> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/?room=${roomCode}&token=${token}`);
  return page;
};

const rankValue = (code: string): number => {
  const rank = code.slice(0, -1);

  if (rank === "J") {
    return 11;
  }

  if (rank === "Q") {
    return 12;
  }

  if (rank === "K") {
    return 13;
  }

  if (rank === "A") {
    return 14;
  }

  return Number(rank);
};

const suitOrder = (code: string): number =>
  ({
    C: 0,
    D: 1,
    H: 2,
    S: 3
  })[code.at(-1) as "C" | "D" | "H" | "S"];

const sortCardCodes = (codes: string[]): string[] =>
  codes.slice().sort((left, right) => suitOrder(left) - suitOrder(right) || rankValue(left) - rankValue(right));

const submitAuctionBid = async (page: Page, tricks: number, trump: "C" | "D" | "H" | "S" | "NT") => {
  await page.getByTestId(`auction-trump-${trump}`).click();
  await page.getByTestId(`auction-tricks-${tricks}`).click();
  await page.getByTestId("auction-submit").click();
};

const assignSeatsAndStart = async (hostPage: Page) => {
  await expect(hostPage.getByTestId("start-match")).toBeVisible();
  await hostPage.getByLabel("Assign Host to N").click();
  await hostPage.getByLabel("Assign East to E").click();
  await hostPage.getByLabel("Assign South to S").click();
  await hostPage.getByLabel("Assign West to W").click();
  await hostPage.getByTestId("start-match").click();
  await expect(hostPage.getByText("Table In Motion")).toBeVisible();
};

const passAuctionAndBet = async (pages: { host: Page; east: Page; south: Page; west: Page }) => {
  await submitAuctionBid(pages.east, 5, "NT");
  await pages.south.getByRole("button", { name: "Pass", exact: true }).click();
  await pages.west.getByRole("button", { name: "Pass", exact: true }).click();
  await pages.host.getByRole("button", { name: "Pass", exact: true }).click();
  await pages.east.getByRole("button", { name: "Bet 5", exact: true }).click();
  await pages.south.getByRole("button", { name: "Bet 3", exact: true }).click();
  await pages.west.getByRole("button", { name: "Bet 3", exact: true }).click();
  await pages.host.getByRole("button", { name: "Bet 1", exact: true }).click();
};

test("four players can start and complete a full deterministic hand with visible history", async ({ browser, request }) => {
  const players = await createRoomSet(request);
  const hostPage = await openPlayerPage(browser, players.host.roomCode, players.host.playerToken);
  const eastPage = await openPlayerPage(browser, players.east.roomCode, players.east.playerToken);
  const southPage = await openPlayerPage(browser, players.south.roomCode, players.south.playerToken);
  const westPage = await openPlayerPage(browser, players.west.roomCode, players.west.playerToken);

  await assignSeatsAndStart(hostPage);
  const hostHand = await hostPage.locator(".hand-panel [data-card-code]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-card-code") ?? "")
  );
  expect(hostHand).toEqual(sortCardCodes(hostHand));
  await passAuctionAndBet({ host: hostPage, east: eastPage, south: southPage, west: westPage });

  const diamonds = ["AD", "KD", "QD", "JD", "10D", "9D", "8D", "7D", "6D", "5D", "4D", "3D", "2D"];
  const hearts = ["AH", "KH", "QH", "JH", "10H", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"];
  const spades = ["AS", "KS", "QS", "JS", "10S", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S"];
  const clubs = ["AC", "KC", "QC", "JC", "10C", "9C", "8C", "7C", "6C", "5C", "4C", "3C", "2C"];

  for (let index = 0; index < 13; index += 1) {
    await eastPage.getByRole("button", { name: diamonds[index]! }).click();
    await southPage.getByRole("button", { name: hearts[index]! }).click();
    await westPage.getByRole("button", { name: spades[index]! }).click();
    await hostPage.getByRole("button", { name: clubs[index]! }).click();
  }

  await expect(hostPage.getByRole("button", { name: "Deal Next Hand" })).toBeVisible();
  await hostPage.getByRole("button", { name: "Show History" }).click();
  await expect(hostPage.getByText("Hand 1")).toBeVisible();
  await hostPage.goto("/");
  await expect(hostPage.getByRole("heading", { name: "Recent Rooms" })).toBeVisible();
  await expect(hostPage.getByRole("heading", { name: "Saved History" })).toBeVisible();
  await expect(hostPage.getByText("1 Hand")).toBeVisible();
  await hostPage.getByRole("button", { name: "Resume" }).first().click();
  await expect(hostPage.getByText("Table In Motion")).toBeVisible();
});

test("undo and reconnect work during an active hand", async ({ browser, request }) => {
  const players = await createRoomSet(request);
  const hostPage = await openPlayerPage(browser, players.host.roomCode, players.host.playerToken);
  const eastPage = await openPlayerPage(browser, players.east.roomCode, players.east.playerToken);
  const southPage = await openPlayerPage(browser, players.south.roomCode, players.south.playerToken);
  const westPage = await openPlayerPage(browser, players.west.roomCode, players.west.playerToken);

  await assignSeatsAndStart(hostPage);

  await submitAuctionBid(eastPage, 5, "H");
  await eastPage.getByRole("button", { name: "Undo Latest Action", exact: true }).click();
  await expect(hostPage.getByText("Auction opening")).toBeVisible();

  await passAuctionAndBet({ host: hostPage, east: eastPage, south: southPage, west: westPage });
  await eastPage.getByRole("button", { name: "AD" }).click();
  await expect(eastPage.locator(".hand-panel [data-card-code]")).toHaveCount(12);
  await eastPage.reload();
  await expect(eastPage.locator(".hand-panel [data-card-code]")).toHaveCount(12);
});
