export const getNowUnix = (): number => Math.floor(Date.now() / 1000);
export const getUnix = (date: Date): number =>
  Math.floor(date.getTime() / 1000);
