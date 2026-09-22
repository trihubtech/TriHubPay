import { rechargeRouter, RechargeRouter } from '../rechargeRouter';

export { rechargeRouter, RechargeRouter };
export const upstreamRouter = rechargeRouter;
export class UpstreamRouter extends RechargeRouter {}
