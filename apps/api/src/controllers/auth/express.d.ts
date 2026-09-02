import type { CurrentUser } from "../../application/auth/resolve-current-user.service";

declare global {
  namespace Express {
    interface Request {
      currentUser: CurrentUser;
    }
  }
}
