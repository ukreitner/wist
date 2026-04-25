import assert from "node:assert/strict";
import request from "supertest";
import { newDb } from "pg-mem";
import { io as createClient } from "socket.io-client";
import { createAppServer } from "../dist/app.js";
import { PostgresRoomStore } from "../dist/postgres-store.js";

const waitForSnapshot = (socket) =>
  new Promise((resolve) => {
    socket.once("snapshot", (snapshot) => resolve(snapshot));
  });

const waitForSnapshotWhere = (socket, predicate, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("snapshot", onSnapshot);
      reject(new Error("Timed out waiting for matching snapshot."));
    }, timeoutMs);

    const onSnapshot = (snapshot) => {
      if (!predicate(snapshot)) {
        return;
      }

      clearTimeout(timeout);
      socket.off("snapshot", onSnapshot);
      resolve(snapshot);
    };

    socket.on("snapshot", onSnapshot);
  });

const serverInstance = await createAppServer({
  dbPath: `.data/test-${Date.now()}-${Math.random()}.sqlite`,
  allowTestPresets: true,
  hostTransferGraceMs: 20,
  roomTtlMs: 500
});
const sockets = [];

try {
  await new Promise((resolve) => {
    serverInstance.httpServer.listen(0, "127.0.0.1", () => resolve());
  });
  const address = serverInstance.httpServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Missing server address.");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host", testPresetKey: "single-suit-hand" });
    const roomCode = host.body.roomCode;
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
    assert.equal(started.match.currentHand.phase, "auction");
    assert.deepEqual(started.match.scores, { N: 12, E: -3, S: 5, W: 0 });
    assert.equal("viewerSeat" in started.view, true);
    console.log("ok - room lifecycle and match start");
  }

  {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host 2", testPresetKey: "single-suit-hand" });
    const roomCode = host.body.roomCode;
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
    await waitForSnapshotWhere(hostSocket, (snapshot) => snapshot.roomStatus === "active");
    eastSocket.disconnect();

    const bootstrap = await request(baseUrl).get(`/api/rooms/${roomCode}/bootstrap`).query({ token: east.body.playerToken });
    assert.equal(bootstrap.body.snapshot.me.seat, "E");
    assert.equal(bootstrap.body.snapshot.view.hand.length, 13);

    const rejoinSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
    sockets.push(rejoinSocket);
    const rejoined = await waitForSnapshot(rejoinSocket);
    assert.equal(rejoined.me.seat, "E");
    assert.equal(rejoined.view.hand.length, 13);
    console.log("ok - reconnect and bootstrap restore");
  }

  {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Socket Swap" });
    const roomCode = host.body.roomCode;
    const firstSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
    sockets.push(firstSocket);
    await waitForSnapshot(firstSocket);

    const oldDisconnect = new Promise((resolve) => firstSocket.once("disconnect", resolve));
    const replacementSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
    sockets.push(replacementSocket);
    await waitForSnapshot(replacementSocket);
    await oldDisconnect;

    replacementSocket.emit("seat.assign", { sessionId: host.body.snapshot.me.sessionId, seat: "N" });
    const assigned = await waitForSnapshotWhere(replacementSocket, (snapshot) => snapshot.me.seat === "N");
    assert.equal(assigned.players.find((player) => player.id === host.body.snapshot.me.sessionId)?.connected, true);
    console.log("ok - replacement socket keeps private snapshot push");
  }

  {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host 3" });
    const roomCode = host.body.roomCode;
    const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East 3" });
    await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South 3" });
    await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West 3" });
    const hostSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: host.body.playerToken } });
    const eastSocket = createClient(baseUrl, { transports: ["websocket"], auth: { roomCode, token: east.body.playerToken } });
    sockets.push(hostSocket, eastSocket);

    await Promise.all([waitForSnapshot(hostSocket), waitForSnapshot(eastSocket)]);
    hostSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 60));
    const eastBootstrap = await request(baseUrl).get(`/api/rooms/${roomCode}/bootstrap`).query({ token: east.body.playerToken });
    assert.equal(eastBootstrap.body.snapshot.me.isHost, true);
    console.log("ok - host transfer after disconnect");
  }

  {
    const host = await request(baseUrl).post("/api/rooms").send({ nickname: "Host 4", testPresetKey: "single-suit-hand" });
    const roomCode = host.body.roomCode;
    const east = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East 4" });
    const south = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "South 4" });
    const west = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "West 4" });
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
    hostSocket.emit("match.start");
    await waitForSnapshotWhere(hostSocket, (snapshot) => snapshot.roomStatus === "active");
    eastSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 40));

    const joinedAgain = await request(baseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "East 4" });
    assert.equal(joinedAgain.status, 201);
    assert.equal(joinedAgain.body.playerToken, east.body.playerToken);
    assert.equal(joinedAgain.body.snapshot.me.seat, "E");
    console.log("ok - same nickname rejoins disconnected player");
  }

  {
    const pgDb = newDb();
    const pgAdapter = pgDb.adapters.createPg();
    const pgStore = await PostgresRoomStore.create({ pool: new pgAdapter.Pool() });
    const pgServer = await createAppServer({
      store: pgStore,
      allowTestPresets: true,
      hostTransferGraceMs: 20,
      roomTtlMs: 500
    });
    const pgSockets = [];

    try {
      await new Promise((resolve) => {
        pgServer.httpServer.listen(0, "127.0.0.1", () => resolve());
      });
      const pgAddress = pgServer.httpServer.address();

      if (!pgAddress || typeof pgAddress === "string") {
        throw new Error("Missing Postgres-backed server address.");
      }

      const pgBaseUrl = `http://127.0.0.1:${pgAddress.port}`;
      const host = await request(pgBaseUrl).post("/api/rooms").send({ nickname: "Pg Host", testPresetKey: "single-suit-hand" });
      const roomCode = host.body.roomCode;
      const east = await request(pgBaseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "Pg East" });
      const south = await request(pgBaseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "Pg South" });
      const west = await request(pgBaseUrl).post(`/api/rooms/${roomCode}/join`).send({ nickname: "Pg West" });
      assert.equal(host.status, 201);
      assert.equal(east.status, 201);
      assert.equal(south.status, 201);
      assert.equal(west.status, 201);

      await pgServer.roomManager.assignSeat(host.body.playerToken, host.body.snapshot.me.sessionId, "N");
      await pgServer.roomManager.assignSeat(host.body.playerToken, east.body.snapshot.me.sessionId, "E");
      await pgServer.roomManager.assignSeat(host.body.playerToken, south.body.snapshot.me.sessionId, "S");
      await pgServer.roomManager.assignSeat(host.body.playerToken, west.body.snapshot.me.sessionId, "W");
      await pgServer.roomManager.startMatch(host.body.playerToken);

      const bootstrap = await request(pgBaseUrl).get(`/api/rooms/${roomCode}/bootstrap`).query({ token: host.body.playerToken });

      assert.equal(bootstrap.body.snapshot.roomStatus, "active");
      assert.equal(bootstrap.body.snapshot.match.currentHand.phase, "auction");
      assert.equal(bootstrap.body.snapshot.view.hand.length, 13);
      console.log("ok - postgres-backed lifecycle matches sqlite flow");
    } finally {
      pgSockets.forEach((socket) => socket.disconnect());
      await pgServer.close();
    }
  }
} finally {
  sockets.forEach((socket) => socket.disconnect());
  await serverInstance.close();
}
