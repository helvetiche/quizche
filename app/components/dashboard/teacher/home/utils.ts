export const getDeadlineProgress = (
  createdAt: string,
  deadline?: string
): number => {
  const now = new Date();
  const created = new Date(createdAt);

  const deadlineDate =
    deadline !== undefined
      ? new Date(deadline)
      : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

  const totalDuration = deadlineDate.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();
  const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);

  return Math.min(100, Math.max(0, remaining));
};

export const getTimeRemainingText = (
  createdAt: string,
  deadline?: string
): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const deadlineDate =
    deadline !== undefined
      ? new Date(deadline)
      : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return "< 1h left";
};
