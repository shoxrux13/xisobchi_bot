import { Context, Scenes } from 'telegraf';

type SceneCtx = Context & {
  scene: Scenes.SceneContextScene<Scenes.SceneContext>;
};

/**
 * Middleware that intercepts bot commands while inside a scene.
 * It leaves the current scene so the command handler in TelegramUpdate
 * can execute normally.
 */
export function sceneInterruptMiddleware() {
  return async (ctx: SceneCtx, next: () => Promise<void>): Promise<void> => {
    const msg = 'message' in ctx.update ? (ctx.update as any).message : null;
    const isCommand =
      msg?.text?.startsWith('/') &&
      msg?.entities?.some((e: any) => e.type === 'bot_command' && e.offset === 0);

    if (isCommand && ctx.scene?.current) {
      await ctx.scene.leave();
    }

    return next();
  };
}
