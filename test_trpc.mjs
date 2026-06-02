import { appRouter } from "./server/routers.js";

// Criar contexto de teste
const ctx = {
  user: {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    repCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => {} },
};

// Chamar rota
const caller = appRouter.createCaller(ctx);
const result = await caller.clients.list();

// Verificar se productType está presente
const claudia = result.find(c => c.clientName.includes("CLAUDIA MARIA"));
console.log("Cliente CLAUDIA MARIA:");
console.log(JSON.stringify(claudia, null, 2));
