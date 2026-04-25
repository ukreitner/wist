import assert from "node:assert/strict";
import request from "supertest";
import { io as createClient, type Socket } from "socket.io-client";
import { createAppServer } from "../src/app.js";
import type { RoomSnapshot } from "../src/types.js";

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

const run = async (): Promise<void> => {
  const serverInstance = await createAppServer({
    dbPath: `.data/test-${Date.now()}-${Math.random()}.sqlite`,
    allowTestPresets: true,
    hostTransferGraceMs: 20,
    roomTtlMs: 500
  });
  const sockets: Socket[] = [];

  try {
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = serverInstance.httpServer.address();

    if (!address || typeof address === "string") {
      throw new Error("Missing server address.");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;

    {
      const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host", testPresetKey: "single-suit-hand" });
      const roomCode = host.body.roomCode as string;
      const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East" });
      const south = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South" });
      const west = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West" });
      const hostSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
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
      const started = await waitForSnapshotWhere(hostSocket, (snapshot) => snapshot.roomStatus === "active");

      assert.equal(started.roomStatus, "active");
      assert.equal(started.match.currentHand?.phase, "auction");
      assert.deepEqual(started.match.scores, { N: 12, E: -3, S: 5, W: 0 });
      assert.equal("viewerSeat" in started.view, true);
      console.log("ok - room lifecycle and match start");
    }

    {
      const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host 2", testPresetKey: "single-suit-hand" });
      const roomCode = host.body.roomCode as string;
      const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East 2" });
      await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South 2" });
      await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West 2" });
      const hostSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
      const eastSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
      sockets.push(hostSocket, eastSocket);

      await Promise.all([waitForSnapshot(hostSocket), waitForSnapshot(eastSocket)]);
      hostSocket.emit("seat.assign", { sessionId: host.body.snapshot.me.sessionId, seat: "N" });
      hostSocket.emit("seat.assign", { sessionId: east.body.snapshot.me.sessionId, seat: "E" });
      const room = serverInstance.roomManager.getRoom(roomCode);
      room.sessions.filter((session) => !["Host 2", "East 2"].includes(session.nickname)).forEach((session, index) => {
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
      const rejoined = await waitForSnapshot(rejoinSocket);
      assert.equal(rejoined.me.seat, "E");
      assert.equal((rejoined.view as { hand: unknown[] }).hand.length, 13);
      console.log("ok - reconnect and bootstrap restore");
    }

    {
      const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host 3" });
      const roomCode = host.body.roomCode as string;
      const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East 3" });
      await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South 3" });
      await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West 3" });
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
      console.log("ok - host transfer after disconnect");
    }
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await serverInstance.close();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
