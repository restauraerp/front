/**
 * Who is doing the talking during the walkthrough.
 *
 * One constant, in one file, on purpose: the picture is meant to be replaced
 * with a real person's - the founder, or whoever the demo is being run by - and
 * that should be dropping a file into `public/walkthrough/` and, at most,
 * changing the line below. Nobody should have to find every card that draws it.
 *
 * The fallback is not decoration. An avatar that 404s renders as a broken image
 * icon in the corner of every step, which looks worse than having no avatar at
 * all, so the component swaps in a drawn initial the moment the load fails.
 */

/** Replace this file, or this path, to change the face. */
export const GUIDE_AVATAR = '/walkthrough/guide.svg';

/** Shown beside the avatar. Not a job title - the name of somebody talking. */
export const GUIDE_NAME = {
  en: 'Your guide',
  bn: 'আপনার গাইড',
} as const;

/** Drawn in place of the picture when it cannot be loaded. */
export const GUIDE_INITIAL = 'R';
