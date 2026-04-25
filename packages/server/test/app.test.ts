import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { io as createClient, type Socket } from "socket.io-client";
import type { RoomSnapshot } from "../src/types.js";
import { createAppServer } from "../src/app.js";

const waitForSnapshot = (socket: Socket): Promise<RoomSnapshot> =>
  new Promise((resolve) => {
    socket.once("snapshot", (snapshot: RoomSnapshot) => resolve(snapshot));
  });

const waitForSnapshotWhere = (socket: Socket, predicate: (snapshot: RoomSnapshot) => boolean): Promise<RoomSnapshot> =>
  new Promise((resolve) => {
    const onSnapshot = (snapshot: RoomSnapshot) => {
      if (predicate(snapshot)) {
        socket.off("snapshot", onSnapshot);
        resolve(snapshot);
      }
    };

    socket.on("snapshot", onSnapshot);
  });

describe("app server", () => {
  let serverInstance: Awaited<ReturnType<typeof createAppServer>>;
  let baseUrl = "";
  const sockets: Socket[] = [];

  beforeEach(async () => {
    serverInstance = await createAppServer({
      dbPath: `.data/test-${Date.now()}-${Math.random()}.sqlite`,
      allowTestPresets: true,
      hostTransferGraceMs: 20,
      roomTtlMs: 500
    });
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = serverInstance.httpServer.address();

    if (!address || typeof address === "string") {
      throw new Error("Missing test server address.");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await serverInstance.close();
  });

  it("creates a room, joins players, assigns seats, and starts a match", async () => {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host", testPresetKey: "single-suit-hand" });
    const roomCode = host.body.roomCode as string;
    const hostToken = host.body.playerToken as string;
    const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East" });
    const south = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South" });
    const west = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West" });

    const hostSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: hostToken } });
    const eastSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
    const southSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: south.body.playerToken } });
    const westSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: west.body.playerToken } });
    sockets.push(hostSocket, eastSocket, southSocket, westSocket);

    await Promise.all([waitForSnapshot(hostSocket), waitForSnapshot(eastSocket), waitForSnapshot(southSocket), waitForSnapshot(westSocket)]);

    hostSocket.emit("seat.assign", { sessionId: host.body.snapshot.me.sessionId, seat: "N" });
    hostSocket.emit("seat.assign", { sessionId: east.body.snapshot.me.sessionId, seat: "E" });
    hostSocket.emit("seat.assign", { sessionId: south.body.snapshot.me.sessionId, seat: "S" });
    hostSocket.emit("seat.assign", { sessionId: west.body.snapshot.me.sessionId, seat: "W" });
    hostSocket.emit("match.start", { initialScores: { N: 12, E: -3, S: 5, W: 0 } });

    const startedSnapshot = await waitForSnapshotWhere(hostSocket, (snapshot) => snapshot.roomStatus === "active");

    assert.equal(startedSnapshot.roomStatus, "active");
    assert.equal(startedSnapshot.match.currentHand?.phase, "auction");
    assert.deepEqual(startedSnapshot.match.scores, { N: 12, E: -3, S: 5, W: 0 });
    assert.equal("viewerSeat" in startedSnapshot.view, true);
  });

  it("rejoins with the same token and restores the same seat and private hand", async () => {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host", testPresetKey: "single-suit-hand" });
    const roomCode = host.body.roomCode as string;
    const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East" });
    await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South" });
    await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West" });

    const hostSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
    const eastSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
    sockets.push(hostSocket, eastSocket);

    await Promise.all([waitForSnapshot(hostSocket), waitForSnapshot(eastSocket)]);

    hostSocket.emit("seat.assign", { sessionId: host.body.snapshot.me.sessionId, seat: "N" });
    hostSocket.emit("seat.assign", { sessionId: east.body.snapshot.me.sessionId, seat: "E" });
    const room = serverInstance.roomManager.getRoom(roomCode);
    room.sessions.filter((session) => !["Host", "East"].includes(session.nickname)).forEach((session, index) => {
      hostSocket.emit("seat.assign", { sessionId: session.id, seat: index === 0 ? "S" : "W" });
    });
    hostSocket.emit("match.start");

    await waitForSnapshot(hostSocket);
    eastSocket.disconnect();

    const bootstrap = await request(baseUrl)
      .get(`/api/rooms/${roomCode}/bootstrap`)
      .query({ token: east.body.playerToken });

    assert.equal(bootstrap.body.snapshot.me.seat, "E");
    assert.equal(bootstrap.body.snapshot.view.hand.length, 13);

    const rejoinSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
    sockets.push(rejoinSocket);
    const rejoinedSnapshot = await waitForSnapshot(rejoinSocket);

    assert.equal(rejoinedSnapshot.me.seat, "E");
    assert.equal((rejoinedSnapshot.view as { hand: unknown[] }).hand.length, 13);
  });

  it("transfers the host role after the host disconnects", async () => {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host" });
    const roomCode = host.body.roomCode as string;
    const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East" });
    await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South" });
    await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West" });

    const hostSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
    const eastSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
    sockets.push(hostSocket, eastSocket);

    await Promise.all([waitForSnapshot(hostSocket), waitForSnapshot(eastSocket)]);

    hostSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 60));

    const eastBootstrap = await request(baseUrl)
      .get(`/api/rooms/${roomCode}/bootstrap`)
      .query({ token: east.body.playerToken });

    assert.equal(eastBootstrap.body.snapshot.me.isHost, true);
  });
});
