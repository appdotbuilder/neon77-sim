import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  registerUserInputSchema,
  loginUserInputSchema,
  adminLoginInputSchema,
  getUserByIdInputSchema,
  createDepositInputSchema,
  getUserDepositsInputSchema,
  processDepositInputSchema,
  createWithdrawalInputSchema,
  getUserWithdrawalsInputSchema,
  processWithdrawalInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { adminLogin } from './handlers/admin_login';
import { getUserById } from './handlers/get_user_by_id';
import { createDeposit } from './handlers/create_deposit';
import { getUserDeposits } from './handlers/get_user_deposits';
import { getAllDeposits } from './handlers/get_all_deposits';
import { processDeposit } from './handlers/process_deposit';
import { createWithdrawal } from './handlers/create_withdrawal';
import { getUserWithdrawals } from './handlers/get_user_withdrawals';
import { getAllWithdrawals } from './handlers/get_all_withdrawals';
import { processWithdrawal } from './handlers/process_withdrawal';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  adminLogin: publicProcedure
    .input(adminLoginInputSchema)
    .mutation(({ input }) => adminLogin(input)),

  getUserById: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserById(input)),

  // Deposit routes
  createDeposit: publicProcedure
    .input(createDepositInputSchema)
    .mutation(({ input }) => createDeposit(input)),

  getUserDeposits: publicProcedure
    .input(getUserDepositsInputSchema)
    .query(({ input }) => getUserDeposits(input)),

  getAllDeposits: publicProcedure
    .query(() => getAllDeposits()),

  processDeposit: publicProcedure
    .input(processDepositInputSchema)
    .mutation(({ input }) => processDeposit(input)),

  // Withdrawal routes
  createWithdrawal: publicProcedure
    .input(createWithdrawalInputSchema)
    .mutation(({ input }) => createWithdrawal(input)),

  getUserWithdrawals: publicProcedure
    .input(getUserWithdrawalsInputSchema)
    .query(({ input }) => getUserWithdrawals(input)),

  getAllWithdrawals: publicProcedure
    .query(() => getAllWithdrawals()),

  processWithdrawal: publicProcedure
    .input(processWithdrawalInputSchema)
    .mutation(({ input }) => processWithdrawal(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();